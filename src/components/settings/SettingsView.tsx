import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { AppIcon } from '../ui/AppIcon';
import { Gym, User } from '../../types';
import { 
  getGym, 
  saveGym, 
  getUser, 
  saveUser, 
  exportAllDataJson, 
  importDataJson 
} from '../../lib/storage';
import { useToast } from '../ui/Toast';
import { useAuth } from '../../context/AuthContext.tsx';

export const SettingsView: React.FC = () => {
  const { showToast } = useToast();
  const { user: authUser, role, setRole, logout } = useAuth();
  const [gym, setGymState] = useState<Gym>(getGym());
  const [user, setUserState] = useState<User>(getUser());

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
                  setRole(r.id as any);
                  showToast(`Role switched to ${r.label}`);
                }}
                className={`p-3 rounded-[14px] border text-left transition-all cursor-pointer ${
                  role.toUpperCase() === r.id
                    ? 'border-[#0071e3] bg-[#0071e3]/5 shadow-2xs'
                    : 'border-[#e5e5ea] bg-white hover:bg-[#fafafc]'
                }`}
              >
                <div className="text-[13px] font-semibold text-[#1d1d1f]">{r.label}</div>
                <div className="text-[11px] text-[#8e8e93] mt-0.5">
                  {role.toUpperCase() === r.id ? '● Active' : 'Select'}
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
              Gym Identity & Branding
            </h3>
            <p className="text-[12px] text-[#8e8e93]">Details displayed on receipts and WhatsApp reminders</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Gym Name</label>
              <input
                type="text"
                value={gym.name}
                onChange={(e) => setGymState({ ...gym, name: e.target.value })}
                className={inputClass}
                placeholder="e.g. Iron Core Fitness"
                required
              />
            </div>

            <div>
              <label className={labelClass}>Gym Contact Phone</label>
              <input
                type="tel"
                value={gym.phone}
                onChange={(e) => setGymState({ ...gym, phone: e.target.value })}
                className={inputClass}
                placeholder="+91 98765 43210"
              />
            </div>

            <div>
              <label className={labelClass}>Email Address</label>
              <input
                type="email"
                value={gym.email}
                onChange={(e) => setGymState({ ...gym, email: e.target.value })}
                className={inputClass}
                placeholder="contact@gym.com"
              />
            </div>

            <div>
              <label className={labelClass}>Currency Code</label>
              <input
                type="text"
                value={gym.currency}
                onChange={(e) => setGymState({ ...gym, currency: e.target.value.toUpperCase() })}
                className={inputClass}
                placeholder="INR"
              />
            </div>

            <div className="sm:col-span-2">
              <label className={labelClass}>Address & Location</label>
              <input
                type="text"
                value={gym.address}
                onChange={(e) => setGymState({ ...gym, address: e.target.value })}
                className={inputClass}
                placeholder="Building, street, area, city, pincode"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Invoicing & Receipt Numbers */}
        <div className="p-6 bg-white border border-[#e5e5ea] rounded-[22px] shadow-xs space-y-4">
          <div className="border-b border-[#f0f0f2] pb-3">
            <h3 className="text-[16px] font-bold text-[#1d1d1f] tracking-tight">
              Receipts & Sequential Numbering
            </h3>
            <p className="text-[12px] text-[#8e8e93]">Configure invoice prefixes and customized footer policy</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Receipt Prefix</label>
              <input
                type="text"
                value={gym.receiptPrefix}
                onChange={(e) => setGymState({ ...gym, receiptPrefix: e.target.value.toUpperCase() })}
                className={inputClass}
                placeholder="GM-"
              />
              <span className="text-[11px] text-[#8e8e93] mt-1 block">
                Generated format: {gym.receiptPrefix}001, {gym.receiptPrefix}002...
              </span>
            </div>

            <div>
              <label className={labelClass}>Default Payment Mode</label>
              <select
                value={gym.defaultPaymentMethod}
                onChange={(e) => setGymState({ ...gym, defaultPaymentMethod: e.target.value as any })}
                className={inputClass}
              >
                <option value="UPI">UPI (Google Pay / PhonePe / Paytm)</option>
                <option value="Cash">Cash</option>
                <option value="Card">Credit / Debit Card</option>
                <option value="Bank Transfer">Bank Transfer / NEFT</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className={labelClass}>Receipt Footer Note / Terms</label>
              <textarea
                value={gym.receiptFooter}
                onChange={(e) => setGymState({ ...gym, receiptFooter: e.target.value })}
                className={`${inputClass} h-20 resize-none`}
                placeholder="Terms and conditions printed at bottom of PDF receipts"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Digital Payments & UPI */}
        <div className="p-6 bg-white border border-[#e5e5ea] rounded-[22px] shadow-xs space-y-4">
          <div className="border-b border-[#f0f0f2] pb-3">
            <h3 className="text-[16px] font-bold text-[#1d1d1f] tracking-tight">
              UPI & Digital Collect
            </h3>
            <p className="text-[12px] text-[#8e8e93]">Display UPI ID and QR on bills for fast instant payment collection</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Business UPI VPA</label>
              <input
                type="text"
                value={gym.upiId}
                onChange={(e) => setGymState({ ...gym, upiId: e.target.value })}
                className={inputClass}
                placeholder="gymname@okaxis"
              />
              <span className="text-[11px] text-[#8e8e93] mt-1 block">
                Used to auto-generate dynamic payment QR codes on digital receipts
              </span>
            </div>
          </div>
        </div>

        {/* Save Bar */}
        <div className="flex justify-end">
          <Button type="submit" variant="primary" size="lg" className="px-8 shadow-xs">
            Save All Settings
          </Button>
        </div>
      </form>

      {/* Section 4: Data Management & Backup */}
      <div className="p-6 bg-white border border-[#e5e5ea] rounded-[22px] shadow-xs space-y-4">
        <div className="border-b border-[#f0f0f2] pb-3">
          <h3 className="text-[16px] font-bold text-[#1d1d1f] tracking-tight">
            Database Backup & Portability
          </h3>
          <p className="text-[12px] text-[#8e8e93]">
            Export or restore your full database records in JSON format
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
        </div>
      </div>
    </div>
  );
};
