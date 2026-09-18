"use client";
import { useEffect, useRef } from "react";
import { useRealtimeChannel } from "@/hooks/realtime/useRealtimeChannel";
import { getContext } from "@/lib/notifications/sounds";

export function useNewMessageSound(orgId: string | null) {
  // Guarda o last_inbound_at mais recente para evitar tocar som em load inicial
  const lastInboundRef = useRef<Record<string, string>>({});

  useRealtimeChannel({
    name: orgId ? `inbox-sound-${orgId}` : "inbox-sound-disabled",
    postgresChanges: orgId
      ? {
          event: "UPDATE",
          schema: "public",
          table: "conversations",
          filter: `organization_id=eq.${orgId}`,
        }
      : undefined,
    onChange: (payload: any) => {
      if (!payload.new || !payload.new.id) return;
      
      const convId = payload.new.id;
      const newInboundAt = payload.new.last_inbound_at;
      
      if (!newInboundAt) return;

      const last = lastInboundRef.current[convId];
      if (last === newInboundAt) return; // Só tocamos se a data for realmente nova
      lastInboundRef.current[convId] = newInboundAt;
      
      // Toca o som apenas se o count for > 0 (há mensagens não lidas para este atendente)
      // Não validamos msAge porque o evento do Supabase Realtime só dispara quando o UPDATE de fato ocorre.
      // Se houvesse drift no relógio do PC, a checagem msAge < 5s poderia bloquear a primeira notificação (falso negativo).
      if (payload.new.unread_count_for_assignee > 0) {
        const ctx = getContext();
        if (ctx) {
          void ctx.resume();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          
          osc.type = "sine";
          osc.frequency.setValueAtTime(660, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
          
          gain.gain.setValueAtTime(0, ctx.currentTime);
          gain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.3);
          
          osc.connect(gain).connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.3);
        }
      }
    },
    enabled: !!orgId,
  });
}
