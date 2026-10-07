import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../ui/Toast';
import { Button } from '../ui/Button';
import { 
  User, 
  QrCode, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  Heart, 
  ShieldCheck, 
  Save, 
  Key, 
  LogOut,
  AlertCircle,
  CheckCircle2,
  Copy
} from 'lucide-react';

export const MemberProfileView: React.FC = () => {
  const { userProfile, gym, logout } = useAuth();
  const { showToast } = useToast();

  const [member, setMember] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form states
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [gender, setGender] = useState('Prefer not to say');
  const [notes, setNotes] = useState('');

  // Link account invite code
  const [inviteCode, setInviteCode] = useState('');
  const [isLinking, setIsLinking] = useState(false);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await api.getMemberProfile();
      setMember(res);
      setPhone(res.phone || '');
      setAddress(res.address || '');
      setEmergencyContactName(res.emergencyContactName || '');
      setEmergencyContactPhone(res.emergencyContactPhone || '');
      setGender(res.gender || 'Prefer not to say');
      setNotes(res.notes || '');
    } catch (err: any) {
      showToast(err.message || 'Failed to load member profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      const updated = await api.updateMemberProfile({
        phone,
        address,
        emergencyContactName,
        emergencyContactPhone,
        gender,
        notes,
      });
      setMember(updated);
      showToast('Profile information updated successfully!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to update profile', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLinkInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;
    try {
      setIsLinking(true);
      const res = await api.linkMemberAccount(inviteCode.trim());
      showToast('Account successfully linked to gym member pass!', 'success');
      setInviteCode('');
      await fetchProfile();
    } catch (err: any) {
      showToast(err.message || 'Invalid or expired invitation token', 'error');
    } finally {
      setIsLinking(false);
    }
  };

  const copyMemberCode = () => {
    if (member?.memberCode) {
      navigator.clipboard.writeText(member.memberCode);
      showToast(`Copied ${member.memberCode} to clipboard!`);
    }
  };

  if (loading && !member) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
        <p className="text-[13px] text-[#86868b]">Loading member profile...</p>
      </div>
    );
  }

  const inputClass = "w-full px-3.5 py-2.5 bg-[#f5f5f7] border border-[#e5e5ea] rounded-[12px] text-[13px] text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:border-[#0071e3] transition-all";
  const labelClass = "text-[12px] font-semibold text-[#1d1d1f] mb-1.5 block";

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white p-6 rounded-[24px] border border-[#e5e5ea] shadow-xs">
        <span className="text-[11px] font-semibold text-[#86868b] tracking-wider uppercase">
          ATHLETE PROFILE & SETTINGS
        </span>
        <h1 className="text-[24px] font-bold text-[#1d1d1f] tracking-tight mt-0.5">
          Member Identity Pass
        </h1>
        <p className="text-[13px] text-[#6e6e73]">
          Digital access card and emergency contact information.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Digital Member Pass */}
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-[#1d1d1f] to-[#2c2c2e] text-white p-6 rounded-[24px] shadow-sm relative overflow-hidden flex flex-col items-center text-center">
            {/* Gym brand tag */}
            <div className="w-full flex items-center justify-between text-[11px] text-white/70 font-semibold mb-4 border-b border-white/10 pb-3">
              <span>{gym?.name || 'RAW POWER GYM'}</span>
              <span className="bg-white/10 px-2 py-0.5 rounded-full text-white">ACCESS PASS</span>
            </div>

            {/* Avatar */}
            <div className="w-20 h-20 rounded-full bg-white/10 border-2 border-white/20 flex items-center justify-center text-[28px] font-bold text-white mb-3 shadow-inner">
              {member?.name?.charAt(0) || 'M'}
            </div>

            <h2 className="text-[18px] font-bold text-white tracking-tight">
              {member?.name}
            </h2>
            <div className="text-[12px] text-white/70 mt-0.5">{member?.email || userProfile?.email}</div>

            {/* QR Mock code */}
            <div className="my-5 p-3.5 bg-white rounded-[16px] shadow-xs flex flex-col items-center">
              <QrCode size={120} className="text-[#1d1d1f]" />
              <span className="text-[10px] text-[#86868b] mt-1 font-mono tracking-wider">
                {member?.memberCode}
              </span>
            </div>

            {/* Member Code badge */}
            <div className="w-full flex items-center justify-between bg-white/10 px-3.5 py-2 rounded-[12px] text-[12px]">
              <span className="text-white/70">Member ID:</span>
              <button
                onClick={copyMemberCode}
                className="font-mono font-bold text-white flex items-center gap-1 hover:text-[#0071e3] transition-colors cursor-pointer"
              >
                <span>{member?.memberCode}</span>
                <Copy size={13} />
              </button>
            </div>

            <div className="w-full mt-3 flex items-center justify-between text-[11px] text-white/60">
              <span>Joined:</span>
              <span>{new Date(member?.joinDate || Date.now()).toLocaleDateString([], { month: 'short', year: 'numeric' })}</span>
            </div>
          </div>

          {/* Invitation Code Linker */}
          <div className="bg-white p-5 rounded-[24px] border border-[#e5e5ea] shadow-xs space-y-3">
            <div className="flex items-center gap-2 font-semibold text-[13px] text-[#1d1d1f]">
              <Key size={15} className="text-[#0071e3]" />
              <span>Claim Invitation Code</span>
            </div>
            <p className="text-[12px] text-[#6e6e73]">
              Have an onboarding code from the gym desk? Enter it to sync your membership.
            </p>
            <form onSubmit={handleLinkInvite} className="space-y-2">
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="e.g. GYM-ABCD12"
                className={`${inputClass} uppercase tracking-wider text-center font-bold`}
              />
              <button
                type="submit"
                disabled={isLinking || !inviteCode.trim()}
                className="w-full py-2 bg-[#f5f5f7] hover:bg-[#e8e8ed] text-[#0071e3] font-semibold text-[12px] rounded-full transition-all disabled:opacity-50 cursor-pointer"
              >
                {isLinking ? 'Verifying...' : 'Link Invitation'}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Self-Service Personal Profile Form */}
        <div className="md:col-span-2 bg-white p-6 rounded-[24px] border border-[#e5e5ea] shadow-xs space-y-5">
          <div>
            <h2 className="text-[18px] font-bold text-[#1d1d1f]">
              Personal Information
            </h2>
            <p className="text-[12px] text-[#6e6e73]">
              Update your contact info and emergency numbers.
            </p>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className={inputClass}
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>
            </div>

            <div>
              <label className={labelClass}>Residential Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Apartment, Street, City"
                className={inputClass}
              />
            </div>

            <div className="p-4 bg-[#fafafc] border border-[#f0f0f2] rounded-[16px] space-y-3">
              <div className="font-semibold text-[12px] text-[#ff3b30] flex items-center gap-1.5 uppercase tracking-wider">
                <Heart size={14} /> Emergency Contact
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Contact Person Name</label>
                  <input
                    type="text"
                    value={emergencyContactName}
                    onChange={(e) => setEmergencyContactName(e.target.value)}
                    placeholder="e.g. Spouse / Parent / Friend"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Contact Mobile Number</label>
                  <input
                    type="tel"
                    value={emergencyContactPhone}
                    onChange={(e) => setEmergencyContactPhone(e.target.value)}
                    placeholder="+91 91234 56789"
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            <div>
              <label className={labelClass}>Personal Fitness Goals & Health Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="E.g. Target: Bench 100kg, 10k run endurance, knee recovery..."
                rows={3}
                className={`${inputClass} resize-none`}
              />
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-[#f0f0f2]">
              <button
                type="button"
                onClick={() => logout()}
                className="px-4 py-2 text-[#ff3b30] hover:bg-[#fff2f2] text-[13px] font-medium rounded-full transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut size={14} />
                <span>Sign Out</span>
              </button>

              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isSaving}
                className="gap-2"
              >
                <Save size={15} />
                <span>Save Profile Changes</span>
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
