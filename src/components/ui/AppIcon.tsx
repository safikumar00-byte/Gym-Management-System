import React from 'react';
import {
  LayoutDashboard,
  Users,
  User,
  CreditCard,
  Layers,
  DollarSign,
  BarChart3,
  Bell,
  Settings,
  Plus,
  Search,
  LogOut,
  Menu,
  X,
  Dumbbell,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Check,
  Lock,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Phone,
  MessageSquare,
  Receipt,
  FileText,
  Calendar,
  Clock,
  ArrowRight,
  ArrowLeft,
  ArrowUpRight,
  RefreshCw,
  Trash2,
  Edit2,
  Filter,
  Download,
  Share2,
  Printer,
  MoreHorizontal,
  Info,
  Crown,
  Briefcase,
  UserCheck2,
  Smartphone,
  Mail,
  Sliders,
  TrendingUp,
  Eye,
  EyeOff,
  Copy,
  ExternalLink,
  Shield,
  Activity,
  LucideIcon
} from 'lucide-react';
import { motion } from 'motion/react';

export type AppIconName =
  | 'house'
  | 'person'
  | 'person.2'
  | 'person.badge.shield'
  | 'creditcard'
  | 'layers'
  | 'chart'
  | 'gear'
  | 'bell'
  | 'plus'
  | 'magnifyingglass'
  | 'arrow.left'
  | 'arrow.right'
  | 'arrow.up.right'
  | 'chevron.right'
  | 'chevron.left'
  | 'chevron.down'
  | 'chevron.up'
  | 'checkmark'
  | 'checkmark.circle'
  | 'xmark'
  | 'xmark.circle'
  | 'lock'
  | 'shield'
  | 'dollarsign'
  | 'receipt'
  | 'doc.text'
  | 'calendar'
  | 'clock'
  | 'phone'
  | 'message'
  | 'dumbbell'
  | 'sparkles'
  | 'refresh'
  | 'trash'
  | 'pencil'
  | 'filter'
  | 'square.and.arrow.up'
  | 'square.and.arrow.down'
  | 'printer'
  | 'ellipsis'
  | 'info.circle'
  | 'exclamationmark.circle'
  | 'crown'
  | 'briefcase'
  | 'user.check'
  | 'smartphone'
  | 'envelope'
  | 'slider.horizontal'
  | 'arrow.up.right.circle'
  | 'chart.line.uptrend'
  | 'eye'
  | 'eye.slash'
  | 'doc.on.doc'
  | 'arrow.up.right.square'
  | 'menu'
  | 'logout'
  | 'activity';

interface AppIconProps {
  name: AppIconName;
  size?: number | string;
  className?: string;
  strokeWidth?: number;
  animated?: 'pulse' | 'scale' | 'spin' | 'none';
  color?: string;
}

const ICON_MAP: Record<AppIconName, LucideIcon> = {
  'house': LayoutDashboard,
  'person': User,
  'person.2': Users,
  'person.badge.shield': ShieldCheck,
  'creditcard': CreditCard,
  'layers': Layers,
  'chart': BarChart3,
  'gear': Settings,
  'bell': Bell,
  'plus': Plus,
  'magnifyingglass': Search,
  'arrow.left': ArrowLeft,
  'arrow.right': ArrowRight,
  'arrow.up.right': ArrowUpRight,
  'chevron.right': ChevronRight,
  'chevron.left': ChevronLeft,
  'chevron.down': ChevronDown,
  'chevron.up': ChevronUp,
  'checkmark': Check,
  'checkmark.circle': CheckCircle2,
  'xmark': X,
  'xmark.circle': AlertCircle,
  'lock': Lock,
  'shield': Shield,
  'dollarsign': DollarSign,
  'receipt': Receipt,
  'doc.text': FileText,
  'calendar': Calendar,
  'clock': Clock,
  'phone': Phone,
  'message': MessageSquare,
  'dumbbell': Dumbbell,
  'sparkles': Sparkles,
  'refresh': RefreshCw,
  'trash': Trash2,
  'pencil': Edit2,
  'filter': Filter,
  'square.and.arrow.up': Share2,
  'square.and.arrow.down': Download,
  'printer': Printer,
  'ellipsis': MoreHorizontal,
  'info.circle': Info,
  'exclamationmark.circle': AlertCircle,
  'crown': Crown,
  'briefcase': Briefcase,
  'user.check': UserCheck2,
  'smartphone': Smartphone,
  'envelope': Mail,
  'slider.horizontal': Sliders,
  'arrow.up.right.circle': ArrowUpRight,
  'chart.line.uptrend': TrendingUp,
  'eye': Eye,
  'eye.slash': EyeOff,
  'doc.on.doc': Copy,
  'arrow.up.right.square': ExternalLink,
  'menu': Menu,
  'logout': LogOut,
  'activity': Activity,
};

export const AppIcon: React.FC<AppIconProps> = ({
  name,
  size = 18,
  className = '',
  strokeWidth = 1.9,
  animated = 'none',
  color,
}) => {
  const IconComponent = ICON_MAP[name] || LayoutDashboard;

  if (animated === 'pulse') {
    return (
      <motion.span
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
        className="inline-flex items-center justify-center shrink-0"
      >
        <IconComponent
          size={size}
          strokeWidth={strokeWidth}
          className={className}
          color={color}
        />
      </motion.span>
    );
  }

  if (animated === 'scale') {
    return (
      <motion.span
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.92 }}
        className="inline-flex items-center justify-center shrink-0"
      >
        <IconComponent
          size={size}
          strokeWidth={strokeWidth}
          className={className}
          color={color}
        />
      </motion.span>
    );
  }

  if (animated === 'spin') {
    return (
      <motion.span
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
        className="inline-flex items-center justify-center shrink-0"
      >
        <IconComponent
          size={size}
          strokeWidth={strokeWidth}
          className={className}
          color={color}
        />
      </motion.span>
    );
  }

  return (
    <IconComponent
      size={size}
      strokeWidth={strokeWidth}
      className={`shrink-0 ${className}`}
      color={color}
    />
  );
};
