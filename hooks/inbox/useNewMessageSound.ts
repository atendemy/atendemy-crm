"use client";
import { useEffect, useRef } from "react";
import { useRealtimeChannel } from "@/hooks/realtime/useRealtimeChannel";

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

      // Se a última mensagem chegou há menos de 10 segundos, significa que é nova.
      // E evitamos tocar para mensagens velhas no primeiro carregamento do canal.
      const msAge = Date.now() - new Date(newInboundAt).getTime();
      
      // Toca o som apenas se a mensagem for realmente recente (menos de 5s) e o count for > 0
      if (msAge < 5000 && payload.new.unread_count_for_assignee > 0) {
        // Tocar som suave de nova mensagem (usando Oscillator igual IncomingCallBanner)
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
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
