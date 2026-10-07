import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { AppIcon } from '../ui/AppIcon';
import { Switch } from '../ui/Switch';
import { MembershipPlan } from '../../types';
import { 
  getPlans, 
  addPlan, 
  updatePlan, 
  deletePlan, 
  getMemberships 
} from '../../lib/storage';
import { formatINR } from '../../lib/calculations';
import { useToast } from '../ui/Toast';

export const PlansView: React.FC = () => {
  const { showToast } = useToast();
  const plans = getPlans();
  const memberships = getMemberships();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<MembershipPlan | null>(null);
  const [planToDelete, setPlanToDelete] = useState<MembershipPlan | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [durationMonths, setDurationMonths] = useState<number>(1);
  const [price, setPrice] = useState<string>('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);

  const openAddModal = () => {
    setName('');
    setDurationMonths(1);
    setPrice('');
    setDescription('');
    setIsActive(true);
    setIsAddModalOpen(true);
  };

  const openEditModal = (p: MembershipPlan) => {
    setEditingPlan(p);
    setName(p.name);
    setDurationMonths(p.durationMonths);
    setPrice(p.price.toString());
    setDescription(p.description || '');
    setIsActive(p.isActive);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const numPrice = parseFloat(price);
    if (!name.trim() || isNaN(numPrice) || numPrice <= 0) {
      showToast('Please enter a valid plan name and price', 'error');
      return;
    }

    try {
      if (editingPlan) {
        updatePlan({
          ...editingPlan,
          name: name.trim(),
          durationMonths,
          price: numPrice,
          description: description.trim(),
          isActive,
        });
        showToast(`Plan ${name} updated`);
        setEditingPlan(null);
      } else {
        addPlan({
          name: name.trim(),
          durationMonths,
          price: numPrice,
          description: description.trim(),
          isActive,
        });
        showToast(`Plan ${name} created`);
        setIsAddModalOpen(false);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to save plan', 'error');
    }
  };

  const handleDeleteClick = (p: MembershipPlan) => {
    const usedCount = memberships.filter((m) => m.planId === p.id).length;
    if (usedCount > 0) {
      showToast(
        `Cannot delete "${p.name}" because it is linked to ${usedCount} member record(s). Deactivate the plan instead.`,
        'error'
      );
      return;
    }
    setPlanToDelete(p);
  };

  const handleConfirmDelete = () => {
    if (planToDelete) {
      deletePlan(planToDelete.id);
      showToast(`Plan ${planToDelete.name} deleted`);
      setPlanToDelete(null);
    }
  };

  const handleToggleActive = (p: MembershipPlan) => {
    updatePlan({
      ...p,
      isActive: !p.isActive,
    });
    showToast(`Plan marked ${!p.isActive ? 'Active' : 'Inactive'}`);
  };

  const inputClass = "w-full px-3.5 py-2.5 bg-[#f2f2f7] hover:bg-[#ebebed] focus:bg-white border border-transparent focus:border-[#0071e3] rounded-[12px] text-[14px] text-[#1d1d1f] placeholder-[#8e8e93] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/20 transition-all";
  const labelClass = "text-[13px] font-medium text-[#1d1d1f] mb-1 block tracking-tight";

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-[26px] sm:text-[30px] font-bold text-[#1d1d1f] tracking-tight">
            Plans
          </h2>
          <span className="text-[12px] font-medium text-[#8e8e93] bg-white border border-[#e5e5ea] px-3 py-0.5 rounded-full shadow-2xs">
            {plans.length} configured
          </span>
        </div>

        <Button variant="primary" size="md" onClick={openAddModal} className="gap-1.5">
          <AppIcon name="plus" size={16} strokeWidth={2.4} />
          <span>New Plan</span>
        </Button>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {plans.map((p) => {
          const activeSubscribers = memberships.filter(
            (m) => m.planId === p.id && m.status === 'Active'
          ).length;

          return (
            <div
              key={p.id}
              className={`p-6 bg-white border rounded-[22px] flex flex-col justify-between transition-all ${
                p.isActive ? 'border-[#e5e5ea] shadow-xs' : 'border-[#e5e5ea] opacity-60'
              }`}
            >
              <div>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-[18px] font-bold text-[#1d1d1f] tracking-tight">
                      {p.name}
                    </h3>
                    <span className="text-[12px] font-medium text-[#8e8e93]">
                      {p.durationMonths} {p.durationMonths === 1 ? 'Month' : 'Months'} duration
                    </span>
                  </div>
                  <button
                    onClick={() => handleToggleActive(p)}
                    className={`px-3 py-0.5 text-[11px] font-semibold rounded-full border cursor-pointer transition-colors ${
                      p.isActive
                        ? 'bg-[#34c759]/10 text-[#34c759] border-[#34c759]/20'
                        : 'bg-[#f2f2f7] text-[#8e8e93] border-[#e5e5ea]'
                    }`}
                  >
                    {p.isActive ? 'Active' : 'Inactive'}
                  </button>
                </div>

                <div className="my-3">
                  <span className="text-[32px] font-bold text-[#1d1d1f] tracking-tight">
                    {formatINR(p.price)}
                  </span>
                  <span className="text-[13px] text-[#8e8e93] ml-1.5 font-normal">
                    / {p.durationMonths}m
                  </span>
                </div>

                <p className="text-[13px] text-[#8e8e93] leading-relaxed min-h-[40px]">
                  {p.description || 'Standard facility access, fitness floor, cardio, and lockers.'}
                </p>

                <div className="mt-4 pt-3 border-t border-[#f0f0f2] text-[12px] text-[#8e8e93] flex items-center gap-1.5">
                  <AppIcon name="person.2" size={14} className="text-[#0071e3]" />
                  <span>{activeSubscribers} active member{activeSubscribers === 1 ? '' : 's'}</span>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-[#f0f0f2] flex items-center justify-end gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => openEditModal(p)}
                  className="h-8 text-[12px] gap-1 px-3"
                >
                  <AppIcon name="pencil" size={12} />
                  <span>Edit</span>
                </Button>
                <button
                  onClick={() => handleDeleteClick(p)}
                  className="w-8 h-8 rounded-full bg-[#f2f2f7] hover:bg-[#ffe5e5] text-[#8e8e93] hover:text-[#ff3b30] flex items-center justify-center transition-colors cursor-pointer"
                  title="Delete Plan"
                >
                  <AppIcon name="trash" size={13} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Plan Modal */}
      <Modal
        isOpen={isAddModalOpen || !!editingPlan}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingPlan(null);
        }}
        title={editingPlan ? 'Edit Membership Plan' : 'Create Plan'}
        subtitle="Define plan duration, pricing, and perks"
        maxWidth="md"
      >
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div>
            <label className={labelClass}>Plan Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Quarterly Pro, Annual Pass"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className={labelClass}>Duration (Months) *</label>
              <input
                type="number"
                min="1"
                max="60"
                required
                value={durationMonths}
                onChange={(e) => setDurationMonths(parseInt(e.target.value) || 1)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Standard Fee (₹) *</label>
              <input
                type="number"
                min="1"
                step="1"
                required
                placeholder="e.g. 5000"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Description / Inclusions</label>
            <textarea
              rows={3}
              placeholder="e.g. Full equipment access, steam bath, cardio zone, locker."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={inputClass}
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[13px] font-medium text-[#1d1d1f]">
              Active for registration and renewals
            </span>
            <Switch checked={isActive} onChange={setIsActive} />
          </div>

          <div className="pt-3 border-t border-[#f0f0f2] flex justify-end gap-2.5">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => {
                setIsAddModalOpen(false);
                setEditingPlan(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="md">
              {editingPlan ? 'Save Changes' : 'Create Plan'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      {planToDelete && (
        <ConfirmDialog
          isOpen={!!planToDelete}
          onClose={() => setPlanToDelete(null)}
          onConfirm={handleConfirmDelete}
          title="Delete Plan"
          message={`Are you sure you want to permanently delete plan "${planToDelete.name}"?`}
          confirmLabel="Delete"
        />
      )}
    </div>
  );
};
