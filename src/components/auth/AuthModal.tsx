import React from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useAuth, AppRole } from '../../context/AuthContext';
import { useToast } from '../ui/Toast';
import { 
  ShieldCheck, 
  Crown, 
  Briefcase, 
  UserCheck2, 
  CheckCircle2, 
  AlertCircle, 
  LogOut,
  Info,
  Dumbbell
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { 
    role, 
    userProfile, 
    isEmailVerified, 
    updateRole, 
    logout, 
    gym, 
    firebaseUser 
  } = useAuth();

  const { showToast } = useToast();

  const handleRoleChange = async (newRole: AppRole) => {
    try {
      await updateRole(newRole);
      showToast(`Active role view switched to ${newRole.toUpperCase()}`);
    } catch {
      showToast('Failed to switch role', 'error');
    }
  };

  const handleSignOut = async () => {
    try {
      await logout();
      showToast('Signed out of session');
      onClose();
    } catch {
      showToast('Failed to sign out', 'error');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Identity & Access Management"
      subtitle={`${gym?.name || 'Commercial Gym'} • Firebase Identity`}
      maxWidth="lg"
    >
      <div className="flex flex-col gap-5 text-[13px] text-[#1d1d1f]">
        {/* Active Session Card */}
        <div className="p-4 bg-[#fafafc] border border-[#e5e5ea] rounded-[18px] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#0071e3]/10 border border-[#0071e3]/20 flex items-center justify-center font-bold text-[15px] text-[#0071e3] shrink-0">
              {(userProfile?.name || firebaseUser?.displayName || 'O').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#1d1d1f] truncate text-[14px]">
                  {userProfile?.name || firebaseUser?.displayName || 'Gym Operator'}
                </span>
                <span className={`text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full border ${
                  role === 'owner' 
                    ? 'border-[#0071e3]/30 text-[#0071e3] bg-[#0071e3]/10' 
                    : role === 'manager'
                    ? 'border-[#ff9500]/30 text-[#ff9500] bg-[#ff9500]/10'
                    : 'border-[#34c759]/30 text-[#34c759] bg-[#34c759]/10'
                }`}>
                  {role}
                </span>
              </div>
              <div className="text-[12px] text-[#8e8e93] truncate mt-0.5">
                {firebaseUser?.email || userProfile?.email || 'No email associated'}
              </div>
            </div>
          </div>

          <div>
            {isEmailVerified ? (
              <span className="inline-flex items-center gap-1.5 text-[12px] text-[#34c759] font-medium bg-[#34c759]/10 border border-[#34c759]/20 px-2.5 py-1 rounded-full">
                <CheckCircle2 size={13} />
                <span>Verified Account</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-[12px] text-[#ff9500] font-medium bg-[#ff9500]/10 border border-[#ff9500]/20 px-2.5 py-1 rounded-full">
                <AlertCircle size={13} />
                <span>Verification Pending</span>
              </span>
            )}
          </div>
        </div>

        {/* Role Access Matrix */}
        <div className="space-y-3">
          <div className="text-[12px] text-[#8e8e93] flex items-center gap-2">
            <Info size={14} className="text-[#0071e3] shrink-0" />
            <span>Select a role perspective to simulate UI views and tenant capabilities.</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* OWNER */}
            <div
              onClick={() => handleRoleChange('owner')}
              className={`p-3.5 rounded-[16px] border cursor-pointer transition-all flex flex-col justify-between gap-2.5 ${
                role === 'owner'
                  ? 'border-[#0071e3] bg-[#0071e3]/5 shadow-2xs'
                  : 'border-[#e5e5ea] bg-white hover:border-[#b0b0b5]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="flex items-center gap-1.5 font-bold text-[13px] text-[#1d1d1f]">
                    <Crown size={14} className="text-[#0071e3]" /> OWNER
                  </span>
                  {role === 'owner' && (
                    <span className="text-[10px] bg-[#0071e3] text-white font-semibold px-2 py-0.5 rounded-full">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#8e8e93]">
                  Full administrative authority: billing, refunds, settings, and staff.
                </p>
              </div>
            </div>

            {/* MANAGER */}
            <div
              onClick={() => handleRoleChange('manager')}
              className={`p-3.5 rounded-[16px] border cursor-pointer transition-all flex flex-col justify-between gap-2.5 ${
                role === 'manager'
                  ? 'border-[#ff9500] bg-[#ff9500]/5 shadow-2xs'
                  : 'border-[#e5e5ea] bg-white hover:border-[#b0b0b5]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="flex items-center gap-1.5 font-bold text-[13px] text-[#1d1d1f]">
                    <Briefcase size={14} className="text-[#ff9500]" /> MANAGER
                  </span>
                  {role === 'manager' && (
                    <span className="text-[10px] bg-[#ff9500] text-white font-semibold px-2 py-0.5 rounded-full">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#8e8e93]">
                  Operations supervisor: memberships, payments, and member renewals.
                </p>
              </div>
            </div>

            {/* TRAINER */}
            <div
              onClick={() => handleRoleChange('trainer')}
              className={`p-3.5 rounded-[16px] border cursor-pointer transition-all flex flex-col justify-between gap-2.5 ${
                role === 'trainer'
                  ? 'border-[#34c759] bg-[#34c759]/5 shadow-2xs'
                  : 'border-[#e5e5ea] bg-white hover:border-[#b0b0b5]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="flex items-center gap-1.5 font-bold text-[13px] text-[#1d1d1f]">
                    <UserCheck2 size={14} className="text-[#34c759]" /> TRAINER
                  </span>
                  {role === 'trainer' && (
                    <span className="text-[10px] bg-[#34c759] text-white font-semibold px-2 py-0.5 rounded-full">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#8e8e93]">
                  Coaching staff: member roster, attendance tracking, and workouts.
                </p>
              </div>
            </div>

            {/* MEMBER */}
            <div
              onClick={() => handleRoleChange('member')}
              className={`p-3.5 rounded-[16px] border cursor-pointer transition-all flex flex-col justify-between gap-2.5 ${
                role === 'member'
                  ? 'border-[#af52de] bg-[#af52de]/5 shadow-2xs'
                  : 'border-[#e5e5ea] bg-white hover:border-[#b0b0b5]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="flex items-center gap-1.5 font-bold text-[13px] text-[#1d1d1f]">
                    <Dumbbell size={14} className="text-[#af52de]" /> MEMBER
                  </span>
                  {role === 'member' && (
                    <span className="text-[10px] bg-[#af52de] text-white font-semibold px-2 py-0.5 rounded-full">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#8e8e93]">
                  Member portal: check-in QR pass, personal dues, workouts, and community.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-[#f0f0f2] flex items-center justify-between">
          <button
            type="button"
            onClick={handleSignOut}
            className="text-[#ff3b30] hover:bg-[#ff3b30]/10 px-3 py-1.5 rounded-full font-semibold text-[13px] flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>

          <Button variant="secondary" size="md" onClick={onClose} className="text-[13px]">
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};
