import React from 'react';
import { Bell, BellRing, CheckCheck, Clock, Cloud, Info, LucideIcon, TriangleAlert, X } from 'lucide-react';
import { AppNotification } from '../types';

interface NotificationCenterProps {
  notifications: AppNotification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onRequestPushPermission: () => void;
  pushPermissionState: NotificationPermission;
  onClose: () => void;
}

const TYPE_ICON: Record<AppNotification['type'], { icon: LucideIcon; tone: string }> = {
  pendencia: { icon: Clock, tone: 'text-red-600 bg-red-50' },
  alerta: { icon: TriangleAlert, tone: 'text-amber-600 bg-amber-50' },
  sync: { icon: Cloud, tone: 'text-blue-600 bg-blue-50' },
  info: { icon: Info, tone: 'text-slate-600 bg-slate-100' },
};

const formatWhen = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

/** Notifications sheet: big rows, tap a row to mark it as read. */
export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onRequestPushPermission,
  pushPermissionState,
  onClose,
}) => {
  const hasUnread = notifications.some((n) => !n.read);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 sm:p-4" onClick={onClose}>
      <div
        className="flex flex-col w-full max-w-lg max-h-[85vh] rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 bg-[#121214] text-white">
          <Bell className="w-8 h-8 text-[#C5A059]" />
          <h2 className="flex-1 text-xl font-black">Avisos</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 transition"
            aria-label="Fechar"
          >
            <X className="w-7 h-7" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {pushPermissionState === 'default' && (
            <button
              type="button"
              onClick={onRequestPushPermission}
              className="w-full flex items-center gap-3 rounded-2xl bg-[#C5A059]/15 border-2 border-[#C5A059]/40 p-3 text-left font-bold text-slate-800"
            >
              <BellRing className="w-8 h-8 shrink-0 text-[#B89047]" />
              Receber avisos no celular
            </button>
          )}

          {notifications.length === 0 ? (
            <p className="flex flex-col items-center gap-2 py-10 text-slate-400">
              <Bell className="w-12 h-12" />
              <span className="text-lg font-bold text-slate-600">Nenhum aviso</span>
            </p>
          ) : (
            notifications.map((n) => {
              const { icon: Icon, tone } = TYPE_ICON[n.type] || TYPE_ICON.info;
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => onMarkAsRead(n.id)}
                  className={`w-full flex items-start gap-3 rounded-2xl border-2 p-3 text-left transition ${
                    n.read ? 'border-slate-100 opacity-60' : 'border-slate-200 bg-white'
                  }`}
                >
                  <span className={`flex items-center justify-center w-12 h-12 shrink-0 rounded-xl ${tone}`}>
                    <Icon className="w-7 h-7" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="flex items-center gap-2">
                      {!n.read && <span className="w-2.5 h-2.5 shrink-0 rounded-full bg-red-600" />}
                      <span className="text-base font-black text-slate-900">{n.title}</span>
                    </span>
                    <span className="block text-sm text-slate-600 line-clamp-2">{n.body}</span>
                    <span className="block text-xs text-slate-400 mt-0.5">{formatWhen(n.date)}</span>
                  </span>
                </button>
              );
            })
          )}
        </div>

        {hasUnread && (
          <div className="p-3 border-t border-slate-200 bg-slate-50">
            <button
              type="button"
              onClick={onMarkAllAsRead}
              className="w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-slate-300 bg-white py-3.5 text-base font-black text-slate-700 active:scale-[0.98] transition"
            >
              <CheckCheck className="w-6 h-6" /> Marcar tudo como lido
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
