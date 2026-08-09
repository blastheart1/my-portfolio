/**
 * work-layout.test.tsx
 *
 * Layout rules that are easy to undo by accident and invisible until someone
 * opens the page on the wrong screen: a workflow list that grows taller than
 * the canvas beside it, a demo frame trapped in a reading-width column, and a
 * transcript pane that fills a phone screen on its own.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/lib/content-queries', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/content-queries')>()),
  isDemoVisible: async () => true,
}));

import CaseStudyLayout from '../CaseStudyLayout';
import TranscriptPanel from '../TranscriptPanel';
import AutomationFlowExplorer from '../AutomationFlow';
import { WORK_PROJECTS } from '@/lib/work-projects';
import { AUTOMATION_FLOWS } from '@/lib/automation-flows';

describe('the demo frame is not trapped in the reading column', () => {
  it('puts the demo outside the prose container', () => {
    const { container } = render(
      <CaseStudyLayout project={WORK_PROJECTS[0]}>
        <div data-testid="demo">demo</div>
      </CaseStudyLayout>
    );

    const prose = container.querySelector('.max-w-6xl')!;
    const demo = screen.getByTestId('demo');

    // Both demos are horizontal. Constraining them to a reading width forced
    // people to pan to see work that fits on one screen.
    expect(prose.contains(demo)).toBe(false);
  });

  it('still caps the width, so an ultrawide does not stretch a canvas', () => {
    const { container } = render(
      <CaseStudyLayout project={WORK_PROJECTS[0]}>
        <div data-testid="demo">demo</div>
      </CaseStudyLayout>
    );

    expect(container.querySelector('.max-w-\\[120rem\\]')).not.toBeNull();
  });

  it('keeps the prose itself narrow', () => {
    render(<CaseStudyLayout project={WORK_PROJECTS[0]} />);

    // Long measure is hard to read; the summary stays in a reading column.
    expect(screen.getByText(WORK_PROJECTS[0].summary).className).toContain('max-w-3xl');
  });
});

describe('the workflow list is bounded', () => {
  it('scrolls rather than growing past about ten rows', () => {
    const { container } = render(<AutomationFlowExplorer />);

    const list = container.querySelector('ul.overflow-y-auto');
    expect(list, 'the workflow list should scroll').not.toBeNull();
    expect(list!.className).toMatch(/max-h-/);
  });

  it('holds more flows than it shows at once', () => {
    // The cap only matters because the catalogue outgrew it.
    expect(AUTOMATION_FLOWS.length).toBeGreaterThan(10);
  });

  it('offers the dropdown above the diagram on small screens', () => {
    const { container } = render(<AutomationFlowExplorer />);

    const select = screen.getByRole('combobox', { name: /workflow/i });
    const canvasArea = container.querySelector('[class*="mt-8"]')!;

    expect(
      select.compareDocumentPosition(canvasArea) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });
});

describe('the transcript pane leaves room on a phone', () => {
  it('is shorter below sm, taller above it', () => {
    const { container } = render(<TranscriptPanel transcript="x" />);

    const region = container.querySelector('.overflow-y-auto')!;
    // 20rem of transcript plus a player fills a 667px screen on its own.
    expect(region.className).toContain('h-56');
    expect(region.className).toContain('sm:h-80');
  });
});
