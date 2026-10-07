import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { AppIcon } from '../ui/AppIcon';
import { Member } from '../../types';
import { updateMember } from '../../lib/storage';
import { useToast } from '../ui/Toast';

interface EditMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: Member | null;
  onSuccess?: () => void;
}

export const EditMemberModal: React.FC<EditMemberModalProps> = ({
  isOpen,
  onClose,
  member,
  onSuccess,
}) => {
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other' | 'Prefer not to say'>('Male');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [address, setAddress] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (member && isOpen) {
      setName(member.name || '');
      setPhone(member.phone || '');
      setEmail(member.email || '');
      setGender(member.gender || 'Male');
      setDateOfBirth(member.dateOfBirth || '');
      setAddress(member.address || '');
      setEmergencyContact(member.emergencyContact || '');
      setNotes(member.notes || '');
    }
  }, [member, isOpen]);

  if (!member) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      showToast('Name and phone are required', 'error');
      return;
    }

    setIsLoading(true);
    try {
      updateMember({
        ...member,
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        gender,
        dateOfBirth,
        address: address.trim(),
        emergencyContact: emergencyContact.trim(),
        notes: notes.trim(),
      });

      setIsLoading(false);
      showToast(`Updated details for ${name}`);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setIsLoading(false);
      showToast(err.message || 'Failed to update member', 'error');
    }
  };

  const inputClass = "w-full px-3.5 py-2.5 bg-[#f2f2f7] hover:bg-[#ebebed] focus:bg-white border border-transparent focus:border-[#0071e3] rounded-[12px] text-[14px] text-[#1d1d1f] placeholder-[#8e8e93] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/20 transition-all";
  const labelClass = "text-[13px] font-medium text-[#1d1d1f] mb-1 block tracking-tight";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Member"
      subtitle={`Member ID: ${member.memberId}`}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Full Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Phone Number *</label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Gender</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value as any)}
              className={inputClass}
            >
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
              <option value="Prefer not to say">Prefer not to say</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Date of Birth</label>
            <input
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Emergency Contact</label>
            <input
              type="text"
              value={emergencyContact}
              onChange={(e) => setEmergencyContact(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div className="pt-3 border-t border-[#f0f0f2] flex justify-end gap-2.5">
          <Button type="button" variant="secondary" size="md" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="md" isLoading={isLoading} className="gap-1.5">
            <AppIcon name="checkmark" size={14} strokeWidth={2.4} />
            <span>Save Changes</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
};
