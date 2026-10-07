import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { 
  getNotifications, 
  markNotificationAsRead, 
  clearAllNotifications, 
  getMembers,
  getGym 
} from '../../lib/storage';
import { formatDate, generateWhatsAppReminderMessage, getWhatsAppUrl } from '../../lib/calculations';
import { useToast } from '../ui/Toast';
import { Member, Notification } from '../../types';
import { 
  Bell, 
  CheckCheck, 
  Trash2, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  MessageSquare, 
  RotateCcw,
  ArrowUpRight 
} from 'lucide-react';

interface NotificationsViewProps {
  onAddPaymentClick: (memberId: string) => void;
  onRenewClick: (member: Member) => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({
  onAddPaymentClick,
  onRenewClick,
}) => {
  const { showToast } = useToast();
  const gym = getGym();
  const notifications = getNotifications();
  const members = getMembers();

  const handleMarkRead = (id: string) => {
    markNotificationAsRead(id);
    showToast('Notification marked as read');
  };

  const handleClearAll = () => {
    clearAllNotifications();
    showToast('All notifications cleared');
  };

  const handleWhatsApp = (memberId?: string) => {
    if (!memberId) return;
    const m = members.find((mem) => mem.id === memberId);
    if (!m) return;
    const msg = generateWhatsAppReminderMessage(gym.name, m.name, 1500);
    const url = getWhatsAppUrl(m.phone, msg);
    window.open(url, '_blank');
  };

  return (
    <div className="flex flex-col gap-6 font-mono">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#27272a] pb-6">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#71717a] mb-1">
            ALERTS & REMINDERS
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            NOTIFICATIONS
          </h1>
          <p className="text-xs text-[#a1a1aa] mt-1">
            Expiring passes, payment dues, and automated renewal alerts
          </p>
        </div>

        {notifications.length > 0 && (
          <Button variant="outline" size="sm" onClick={handleClearAll} className="gap-1.5 text-xs">
            <Trash2 size={13} />
            <span>CLEAR ALL</span>
          </Button>
        )}
      </div>

      {/* Notifications List */}
      <div className="bg-[#161618] border border-[#27272a]">
        {notifications.length === 0 ? (
          <div className="p-12 text-center text-[#71717a] text-xs">
            <Bell size={24} className="mx-auto mb-2 opacity-40 text-white" />
            <p>No new notifications. All alerts have been reviewed.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#27272a]">
            {notifications.map((n) => {
              const member = n.relatedMemberId
                ? members.find((m) => m.id === n.relatedMemberId)
                : null;

              return (
                <div
                  key={n.id}
                  className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                    n.isRead ? 'bg-[#161618] opacity-75' : 'bg-[#0d0d0f]'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 shrink-0">
                      {n.type === 'Overdue' && (
                        <div className="w-7 h-7 bg-[#ef4444]/10 border border-[#ef4444]/30 flex items-center justify-center text-[#ef4444]">
                          <AlertTriangle size={14} />
                        </div>
                      )}
                      {(n.type === 'Expiring' || n.type === 'Expired') && (
                        <div className="w-7 h-7 bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
                          <Clock size={14} />
                        </div>
                      )}
                      {n.type === 'PaymentReceived' && (
                        <div className="w-7 h-7 bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500">
                          <CheckCircle2 size={14} />
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-bold text-xs">{n.title}</span>
                        {!n.isRead && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#e17100]" />
                        )}
                        <span className="text-[10px] text-[#71717a]">
                          {formatDate(n.date)}
                        </span>
                      </div>
                      <p className="text-xs text-[#a1a1aa] mt-1 leading-relaxed">
                        {n.message}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {member && (n.type === 'Overdue' || n.type === 'Expiring') && (
                      <button
                        onClick={() => handleWhatsApp(member.id)}
                        className="px-2 py-1 bg-[#0d0d0f] border border-emerald-900/50 text-emerald-400 hover:bg-emerald-950/30 text-[10px] flex items-center gap-1 transition-colors"
                      >
                        <MessageSquare size={12} />
                        <span>WHATSAPP</span>
                      </button>
                    )}

                    {member && n.type === 'Overdue' && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => onAddPaymentClick(member.id)}
                        className="h-7 text-[10px]"
                      >
                        PAY
                      </Button>
                    )}

                    {member && (n.type === 'Expiring' || n.type === 'Expired') && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onRenewClick(member)}
                        className="h-7 text-[10px]"
                      >
                        RENEW
                      </Button>
                    )}

                    {!n.isRead && (
                      <button
                        onClick={() => handleMarkRead(n.id)}
                        className="p-1.5 text-[#71717a] hover:text-white transition-colors"
                        title="Mark as read"
                      >
                        <CheckCheck size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
