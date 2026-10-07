import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { AppIcon } from '../ui/AppIcon';
import { Gym, User } from '../../types';
import { 
  getGym, 
  saveGym, 
  getUser, 
  saveUser, 
  exportAllDataJson, 
  importDataJson, 
  resetToDemoData 
} from '../../lib/storage';
import { useToast } from '../ui/Toast';
import { useAuth } from '../../context/AuthContext.tsx';

export const SettingsView: React.FC = () => {
  const { showToast } = useToast();
  const { user: authUser, role, setRole, logout } = useAuth();
  const [gym, setGymState] = useState<Gym>(getGym());
  const [user, setUserState] = useState<User>(getUser());
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  useEffect(() => {
    setGymState(getGym());
    setUserState(getUser());
  }, []);

  const handleSaveGym = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      saveGym(gym);
      saveUser(user);
      showToast('Settings saved successfully');
    } catch {
      showToast('Failed to save settings', 'error');
    }
  };

  const handleExportBackup = () => {
    const jsonStr = exportAllDataJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `gym-manager-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Exported complete database backup (JSON)');
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const success = importDataJson(content);
        if (success) {
          showToast('Data restored successfully! Refreshing...');
          setTimeout(() => window.location.reload(), 1000);
        } else {
          showToast('Invalid backup file structure', 'error');
        }
      } catch {
        showToast('Error reading backup file', 'error');
      }
    };
    reader.readAsText(file);
  };

  const handleResetDemoData = () => {
    resetToDemoData();
    showToast('Reset to initial data');
    setTimeout(() => window.location.reload(), 800);
  };

  const inputClass = "w-full px-3.5 py-2.5 bg-[#f2f2f7] hover:bg-[#ebebed] focus:bg-white border border-transparent focus:border-[#0071e3] rounded-[12px] text-[14px] text-[#1d1d1f] placeholder-[#8e8e93] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/20 transition-all";
  const labelClass = "text-[13px] font-medium text-[#1d1d1f] mb-1 block tracking-tight";

  const roles = [
    { id: 'OWNER', label: 'Owner (Full Access)' },
    { id: 'MANAGER', label: 'Manager' },
    { id: 'TRAINER', label: 'Trainer (Members Only)' },
    { id: 'FRONT_DESK', label: 'Front Desk' },
  ] as const;

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-[26px] sm:text-[30px] font-bold text-[#1d1d1f] tracking-tight">
            Settings
          </h2>
          <p className="text-[13px] text-[#8e8e93] mt-0.5">
            Gym branding, receipt numbers, UPI parameters, and database backup
          </p>
        </div>
      </div>

      {/* Staff Account & Active Role Switcher */}
      <div className="p-6 bg-white border border-[#e5e5ea] rounded-[22px] shadow-xs space-y-4">
        <div className="border-b border-[#f0f0f2] pb-3 flex items-center justify-between">
          <div>
            <h3 className="text-[16px] font-bold text-[#1d1d1f] tracking-tight">
              User & Access Control
            </h3>
            <p className="text-[12px] text-[#8e8e93]">Logged in as {authUser?.email || user.email}</p>
          </div>
          <button
            onClick={logout}
            className="text-[12px] font-medium text-[#ff3b30] hover:bg-[#ff3b30]/10 px-3 py-1.5 rounded-full transition-colors cursor-pointer"
          >
            Sign Out
          </button>
        </div>

        <div>
          <label className={labelClass}>Active Role Simulation</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            {roles.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  setRole(r.id);
                  showToast(`Role switched to ${r.label}`);
                }}
                className={`p-3 rounded-[14px] border text-left transition-all cursor-pointer ${
                  role === r.id
                    ? 'border-[#0071e3] bg-[#0071e3]/5 shadow-2xs'
                    : 'border-[#e5e5ea] bg-white hover:bg-[#fafafc]'
                }`}
              >
                <div className="text-[13px] font-semibold text-[#1d1d1f]">{r.label}</div>
                <div className="text-[11px] text-[#8e8e93] mt-0.5">
                  {role === r.id ? '● Active' : 'Select'}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <form onSubmit={handleSaveGym} className="flex flex-col gap-6">
        {/* Section 1: Gym Identity & Branding */}
        <div className="p-6 bg-white border border-[#e5e5ea] rounded-[22px] shadow-xs space-y-4">
          <div className="border-b border-[#f0f0f2] pb-3">
            <h3 className="text-[16px] font-bold text-[#1d1d1f] tracking-tight">
              Gym Branding & Contact
            </h3>
            <p className="text-[12px] text-[#8e8e93]">Displayed on receipts, headers, and WhatsApp messages</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Gym Name *</label>
              <input
                type="text"
                required
                value={gym.name}
                onChange={(e) => setGymState({ ...gym, name: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Contact Phone *</label>
              <input
                type="tel"
                required
                value={gym.phone}
                onChange={(e) => setGymState({ ...gym, phone: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Email Address</label>
              <input
                type="email"
                value={gym.email}
                onChange={(e) => setGymState({ ...gym, email: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>GSTIN / Tax ID</label>
              <input
                type="text"
                value={gym.gstin || ''}
                onChange={(e) => setGymState({ ...gym, gstin: e.target.value })}
                placeholder="e.g. 29AAAAA0000A1Z5"
                className={inputClass}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Physical Address</label>
              <input
                type="text"
                value={gym.address}
                onChange={(e) => setGymState({ ...gym, address: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* Section 2: Receipt & Payment Parameters */}
        <div className="p-6 bg-white border border-[#e5e5ea] rounded-[22px] shadow-xs space-y-4">
          <div className="border-b border-[#f0f0f2] pb-3">
            <h3 className="text-[16px] font-bold text-[#1d1d1f] tracking-tight">
              Receipt & Invoicing Parameters
            </h3>
            <p className="text-[12px] text-[#8e8e93]">
              Prefixing sequence and business UPI settlement parameters
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Receipt Prefix</label>
              <input
                type="text"
                value={gym.receiptPrefix}
                onChange={(e) => setGymState({ ...gym, receiptPrefix: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Business UPI ID</label>
              <input
                type="text"
                value={gym.upiId || ''}
                placeholder="e.g. ironforge@okhdfcbank"
                onChange={(e) => setGymState({ ...gym, upiId: e.target.value })}
                className={inputClass}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Receipt Footer Note</label>
              <input
                type="text"
                value={gym.receiptFooter || ''}
                placeholder="Thank you for training with us! Fees once paid are non-refundable."
                onChange={(e) => setGymState({ ...gym, receiptFooter: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button type="submit" variant="primary" size="md" className="gap-2">
            <AppIcon name="checkmark" size={15} strokeWidth={2.4} />
            <span>Save Settings</span>
          </Button>
        </div>
      </form>

      {/* Section 3: Data Recovery & Backups */}
      <div className="p-6 bg-white border border-[#e5e5ea] rounded-[22px] shadow-xs space-y-4">
        <div className="border-b border-[#f0f0f2] pb-3">
          <h3 className="text-[16px] font-bold text-[#1d1d1f] tracking-tight">
            Database Backup & Recovery
          </h3>
          <p className="text-[12px] text-[#8e8e93]">
            Export or import your full database (members, plans, payments, expenses)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button variant="secondary" size="md" onClick={handleExportBackup} className="gap-1.5 text-[13px]">
            <AppIcon name="square.and.arrow.down" size={14} />
            <span>Export Backup (JSON)</span>
          </Button>

          <label className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-[#e5e5ea] hover:bg-[#fafafc] text-[#1d1d1f] rounded-full cursor-pointer transition-colors text-[13px] font-medium shadow-2xs">
            <AppIcon name="square.and.arrow.up" size={14} />
            <span>Restore Backup</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImportBackup}
              className="hidden"
            />
          </label>

          <button
            type="button"
            onClick={() => setIsResetConfirmOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-[#ff3b30] hover:bg-[#ff3b30]/10 rounded-full transition-colors text-[13px] font-medium ml-auto cursor-pointer"
          >
            <AppIcon name="arrow.counterclockwise" size={14} />
            <span>Reset Demo Data</span>
          </button>
        </div>
      </div>

      {/* Reset Confirmation Dialog */}
      {isResetConfirmOpen && (
        <ConfirmDialog
          isOpen={isResetConfirmOpen}
          onClose={() => setIsResetConfirmOpen(false)}
          onConfirm={handleResetDemoData}
          title="Reset Application Data?"
          message="This will erase any newly added members or transactions and restore initial demo records. Are you sure?"
          confirmLabel="Reset Everything"
          isDestructive={true}
        />
      )}
    </div>
  );
};
