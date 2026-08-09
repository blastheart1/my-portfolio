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

describe('the case study runs to the viewport', () => {
  it('constrains no part of the page to a reading-width column', () => {
    const { container } = render(
      <CaseStudyLayout project={WORK_PROJECTS[0]}>
        <div data-testid="demo">demo</div>
      </CaseStudyLayout>
    );

    // This previously asserted the demo sat outside a max-w-6xl prose column.
    // The header runs full width too now — a narrow header above a full-width
    // demo read as two different pages stacked — so there is no such column
    // left to escape from.
    expect(container.querySelector('.max-w-6xl')).toBeNull();
    expect(screen.getByTestId('demo')).toBeInTheDocument();
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

describe('the workflow list is bounded by the frame, not by a row count', () => {
  it('scrolls', () => {
    const { container } = render(<AutomationFlowExplorer />);

    const list = container.querySelector('ul.overflow-y-auto');
    expect(list, 'the workflow list should scroll').not.toBeNull();
  });

  it('caps itself on the available height rather than a fixed row count', () => {
    const { container } = render(<AutomationFlowExplorer />);

    const list = container.querySelector('ul.overflow-y-auto')!;
    // A fixed max-height was always a guess at the viewport. The frame is
    // height-bounded now, so the list just fills what is left.
    expect(list.className).not.toMatch(/max-h-\[/);
    expect(list.className).toMatch(/flex-1/);
  });

  it('holds more flows than fit on a screen', () => {
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

describe('the diagram comes before the copy', () => {
  it('puts the canvas above the problem and outcome', () => {
    const { container } = render(<AutomationFlowExplorer />);

    const canvas = container.querySelector('.overflow-hidden.rounded-lg')!;
    const problem = screen.getByText(/the problem/i);

    // Landing on a case study should land on the thing itself. The framing
    // reads better after you have seen what it is describing.
    expect(
      canvas.compareDocumentPosition(problem) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it('puts the run controls below the diagram too', () => {
    const { container } = render(<AutomationFlowExplorer />);

    const canvas = container.querySelector('.overflow-hidden.rounded-lg')!;
    const run = screen.getByRole('button', { name: /run it/i });

    expect(
      canvas.compareDocumentPosition(run) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it('states the running record once, not twice', () => {
    render(<AutomationFlowExplorer />);
    const summary = AUTOMATION_FLOWS[0].scenarios![0].summary;

    // The scenario description and a separate "Running:" line printed the same
    // sentence one after the other.
    expect(screen.getAllByText(summary)).toHaveLength(1);
  });
});


describe('the demo frame can fill the viewport', () => {
  it('pins and bounds its height when asked', () => {
    const { container } = render(
      <CaseStudyLayout project={WORK_PROJECTS[0]} fillViewport>
        <div>demo</div>
      </CaseStudyLayout>
    );

    const frame = container.querySelector('.rounded-xl')!;
    expect(frame.className).toContain('md:sticky');
    expect(frame.className).toMatch(/md:max-h-/);
  });

  it('leaves the frame alone by default', () => {
    const { container } = render(
      <CaseStudyLayout project={WORK_PROJECTS[0]}>
        <div>demo</div>
      </CaseStudyLayout>
    );

    // Opt-in: a demo that is simply tall would be worse inside a fixed-height
    // box than outside one.
    expect(container.querySelector('.rounded-xl')!.className).not.toContain('md:sticky');
  });

  it('gives each pane its own scroll region', () => {
    const { container } = render(<AutomationFlowExplorer />);

    const scrollers = container.querySelectorAll('.md\\:overflow-y-auto, ul.overflow-y-auto');
    // The list and the diagram column scroll independently, so reading one
    // never moves the other.
    expect(scrollers.length).toBeGreaterThanOrEqual(2);
  });
});
