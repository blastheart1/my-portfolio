import {
  Home,
  User,
  Briefcase,
  Code,
  FolderOpen,
  FlaskConical,
  DollarSign,
  BookOpen,
  Mail,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  /** Must match the DOM id of the section it scrolls to. */
  id: string;
  label: string;
  icon: LucideIcon;
}

/**
 * Site navigation, shared by the desktop pill and the mobile bar.
 *
 * The two components carried byte-identical private copies, so adding a
 * section meant remembering to edit both. Order here is the order on the page.
 */
export const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'about', label: 'About', icon: User },
  { id: 'experience', label: 'Experience', icon: Briefcase },
  { id: 'skills', label: 'Skills', icon: Code },
  { id: 'projects', label: 'Projects', icon: FolderOpen },
  { id: 'lab', label: 'Lab', icon: FlaskConical },
  { id: 'services', label: 'Services', icon: DollarSign },
  { id: 'blog', label: 'Blog', icon: BookOpen },
  { id: 'contact', label: 'Contact', icon: Mail },
];
