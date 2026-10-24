import React from 'react';
import { BrainCircuit, Compass, GraduationCap, Sparkles } from 'lucide-react';

const ornamentMap = {
  student: { Icon: GraduationCap, label: 'LEARN · PRACTISE · GROW', number: '01' },
  faculty: { Icon: Compass, label: 'NOTICE · GUIDE · SUPPORT', number: '02' },
  dean: { Icon: BrainCircuit, label: 'SEE · CONNECT · LEAD', number: '03' },
};

export function PortalOrnaments({ role }) {
  const { Icon, label, number } = ornamentMap[role];
  return (
    <div className={`portal-ornaments portal-ornaments-${role}`} aria-hidden="true">
      <div className="ornament-orb"><Icon size={18} /><span>{number}</span></div>
      <div className="ornament-copy"><Sparkles size={12} />{label}</div>
      <span className="ornament-line" />
    </div>
  );
}
