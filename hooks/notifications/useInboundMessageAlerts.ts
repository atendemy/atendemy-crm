"use client";

import { useCallback, useEffect } from "react";

import { useActiveOrg } from "@/hooks/auth/AuthProvider";
import { getOpenConversationId } from "@/hooks/notifications/OpenConversationContext";
import { useRealtimeChannel } from "@/hooks/realtime/useRealtimeChannel";
import { avatarUrlServivel } from "@/lib/notifications/avatar_url";
import { entregarAviso } from "@/lib/notifications/deliver";
import { shouldNotifyInbound } from "@/lib/notifications/policy";
import { syncPushSubscription } from "@/lib/notifications/push_client";
import { createClient } from "@/lib/supabase/browser";

function tabFocused(): boolean {
  if (typeof document === "undefined") return false;
  return document.visibilityState === "visible" && document.hasFocus();
}

/** postgres_changes entrega `{ new }`; alguns mocks aninham em `payload`. */
function rowFromRealtime(payload: unknown): Record<string, unknown> | null {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as {
    tipo?: unknown;
    new?: unknown;
    record?: unknown;
    payload?: { new?: unknown };
  };
  if (p.tipo === "reassinado") return null;
  const raw = p.new ?? p.record ?? p.payload?.new;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  return raw as Record<string, unknown>;
}

function previewFromMessage(row: { type?: unknown; body?: unknown }): string {
  if (row.type !== "text") return "Mídia";
  const body = typeof row.body === "string" ? row.body.trim() : "";
  return body || "Nova mensagem";
}

async function contactNotifyBits(contactId: string): Promise<{ title: string; icon?: string }> {
  const supabase = createClient();
  const { data } = await supabase
    .from("contacts")
    .select("display_name, name")
    .eq("id", contactId)
    .maybeSingle();
  const row = data as { display_name?: string | null; name?: string | null } | null;
  const title = (row?.display_name || row?.name || "Nova mensagem").trim() || "Nova mensagem";
  let icon: string | undefined;
  try {
    const r = await fetch(`/api/v1/contacts/${contactId}/avatar`, {
      credentials: "include",
      redirect: "follow",
    });
    icon = r.ok ? avatarUrlServivel(r.url, window.location.origin) : undefined;
  } catch {
    // sem foto: badge da marca
  }
  return { title, icon };
}

interface ConversationAlertMeta {
  contactId: string | null;
  assignedToUserId: string | null;
  botSilencedUntil: string | null;
  status: string | null;
}

async function conversationAlertMetaFromRow(
  row: Record<string, unknown>,
  conversationId: string | null,
): Promise<ConversationAlertMeta | null> {
  const inlineContactId = typeof row.contact_id === "string" ? row.contact_id : null;
  if (!conversationId) {
    return inlineContactId
      ? { contactId: inlineContactId, assignedToUserId: null, botSilencedUntil: null, status: null }
      : null;
  }
  const supabase = createClient();
  const { data } = await supabase
    .from("conversations")
    .select("contact_id, assigned_to_user_id, bot_silenced_until, status")
    .eq("id", conversationId)
    .maybeSingle();
  const c = data as {
    contact_id?: string | null;
    assigned_to_user_id?: string | null;
    bot_silenced_until?: string | null;
    status?: string | null;
  } | null;
  return {
    contactId: typeof c?.contact_id === "string" ? c.contact_id : inlineContactId,
    assignedToUserId: typeof c?.assigned_to_user_id === "string" ? c.assigned_to_user_id : null,
    botSilencedUntil: typeof c?.bot_silenced_until === "string" ? c.bot_silenced_until : null,
    status: typeof c?.status === "string" ? c.status : null,
  };
}

function isHumanAttending(meta: ConversationAlertMeta | null): boolean {
  if (!meta) return true;
  if (meta.assignedToUserId) return true;
  if (meta.botSilencedUntil) return true;
  if (meta.status === "pending" || meta.status === "claimed") return true;
  return false;
}

export function useInboundMessageAlerts(): void {
  const orgId = useActiveOrg()?.orgId ?? null;

  useEffect(() => {
    if (!orgId) return;
    void syncPushSubscription();
  }, [orgId]);

  const onChange = useCallback((payload: unknown) => {
    const row = rowFromRealtime(payload);
    if (!row) return;
    const conversationId = typeof row.conversation_id === "string" ? row.conversation_id : null;
    const direction = typeof row.direction === "string" ? row.direction : null;
    if (
      !shouldNotifyInbound({
        direction,
        conversationId,
        openConversationId: getOpenConversationId(),
        tabFocused: tabFocused(),
        tipo: (payload as { tipo?: unknown }).tipo,
      })
    ) {
      return;
    }
    void (async () => {
      const meta = await conversationAlertMetaFromRow(row, conversationId);
      // IA conversando de forma autônoma: não apita nem incomoda o atendente
      if (!isHumanAttending(meta)) {
        return;
      }
      const contactId = meta?.contactId ?? null;
      const bits = contactId
        ? await contactNotifyBits(contactId)
        : { title: "Nova mensagem" as const, icon: undefined };
      entregarAviso({
        category: "message",
        kind: "message_inbound",
        title: bits.title,
        body: previewFromMessage(row),
        tag: conversationId ?? undefined,
        href: conversationId ? `/app/inbox?id=${conversationId}` : undefined,
        icon: bits.icon,
      });
    })();
  }, []);

  useRealtimeChannel({
    name: orgId ? `alerts-messages-${orgId}` : "alerts-messages-disabled",
    postgresChanges: orgId
      ? {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `organization_id=eq.${orgId}`,
        }
      : undefined,
    onChange,
    enabled: !!orgId,
  });
}
