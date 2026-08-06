'use client';

import { Switch } from '@/components/ui/switch';

interface Props {
  id: string;
  label: string;
  visible: boolean;
  onToggle: (id: string, visible: boolean) => void;
}

/**
 * A single section's visibility row.
 *
 * Now delegates to the shared Switch, which fixes two things: the control used
 * aria-pressed (announcing a toggle button rather than an on/off state) and it
 * had no accessible name, so a screen reader read only "button, pressed" with
 * no indication of which section.
 */
export default function SectionToggle({ id, label, visible, onToggle }: Props) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
      <span className="text-sm font-medium text-card-foreground">{label}</span>
      <Switch
        checked={visible}
        onCheckedChange={next => onToggle(id, next)}
        label={`${visible ? 'Hide' : 'Show'} ${label} section`}
      />
    </div>
  );
}
