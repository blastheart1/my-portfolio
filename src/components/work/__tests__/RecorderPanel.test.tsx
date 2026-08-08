/**
 * RecorderPanel.test.tsx
 *
 * The failure that matters is not a broken recorder — it is a page that
 * demands microphone access on load, or that becomes useless the moment
 * someone says no. A visitor who denies the prompt must still be able to try
 * the demo.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const recorder = {
  recState: 'idle' as string,
  recError: '',
  recSecs: 0,
  audioURL: null as string | null,
  blob: null as Blob | null,
  levels: new Array(32).fill(0),
  toggle: vi.fn(),
  discard: vi.fn(),
};

vi.mock('@/lib/demo/relay/useRecorder', () => ({
  useRecorder: () => recorder,
  MAX_SECONDS: 60,
  extForMime: () => 'webm',
}));

import RecorderPanel from '../RecorderPanel';

const getUserMedia = vi.fn();

beforeEach(() => {
  Object.assign(recorder, {
    recState: 'idle',
    recError: '',
    recSecs: 0,
    audioURL: null,
    blob: null,
    levels: new Array(32).fill(0),
  });
  recorder.toggle.mockReset();
  recorder.discard.mockReset();
  getUserMedia.mockReset();
  vi.stubGlobal('navigator', { ...navigator, mediaDevices: { getUserMedia } });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('the permission prompt is never a surprise', () => {
  it('does not touch getUserMedia on mount', () => {
    render(<RecorderPanel onCaptured={vi.fn()} />);

    // Landing on the page must not raise a browser permission dialog.
    expect(getUserMedia).not.toHaveBeenCalled();
  });

  it('only starts recording from an explicit click', async () => {
    const user = userEvent.setup();
    render(<RecorderPanel onCaptured={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /use microphone/i }));

    expect(recorder.toggle).toHaveBeenCalledTimes(1);
  });

  it('explains the browser dialog while it is open', () => {
    recorder.recState = 'requesting';
    render(<RecorderPanel onCaptured={vi.fn()} />);

    expect(screen.getByRole('button', { name: /waiting for permission/i })).toBeInTheDocument();
  });
});

describe('a denied microphone is not a dead end', () => {
  beforeEach(() => {
    recorder.recState = 'denied';
  });

  it('says how to undo it rather than offering a button that cannot work', async () => {
    render(<RecorderPanel onCaptured={vi.fn()} />);

    expect(screen.getByRole('alert')).toHaveTextContent(/allow it in the site settings/i);
    // Browsers will not re-prompt after a denial, so the record button is
    // disabled rather than pretending a retry would do something.
    expect(screen.getByRole('button', { name: /microphone blocked/i })).toBeDisabled();
  });

  it('leaves upload fully usable', async () => {
    render(<RecorderPanel onCaptured={vi.fn()} />);

    expect(screen.getByRole('button', { name: /upload a clip/i })).toBeEnabled();
  });
});

describe('an unsupported browser degrades quietly', () => {
  it('hides recording but keeps upload', () => {
    recorder.recState = 'unsupported';
    render(<RecorderPanel onCaptured={vi.fn()} />);

    expect(screen.queryByRole('button', { name: /use microphone/i })).toBeNull();
    expect(screen.getByRole('button', { name: /upload a clip/i })).toBeEnabled();
    expect(screen.getByText(/cannot record audio/i)).toBeInTheDocument();
  });
});

describe('upload validation happens before anything leaves the browser', () => {
  it('restricts the picker to audio types', () => {
    const { container } = render(<RecorderPanel onCaptured={vi.fn()} />);

    // The picker filter is the first line of defence and the only one a
    // browser enforces for us; the size guard below and the server checks in
    // transcribe/route.ts are the ones that catch a renamed or dragged file.
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input.accept).toContain('audio/webm');
    expect(input.accept).not.toContain('application/pdf');
  });

  it('rejects a clip over 5 MB without uploading it', async () => {
    const user = userEvent.setup();
    const onCaptured = vi.fn();
    const { container } = render(<RecorderPanel onCaptured={onCaptured} />);

    const big = new File([new Uint8Array(6 * 1024 * 1024)], 'big.webm', { type: 'audio/webm' });
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, big);

    expect(screen.getByRole('alert')).toHaveTextContent(/limit is 5 MB/i);
    expect(onCaptured).not.toHaveBeenCalled();
  });

  it('accepts a valid clip', async () => {
    const user = userEvent.setup();
    const onCaptured = vi.fn();
    vi.stubGlobal('URL', { ...URL, createObjectURL: () => 'blob:test' });
    const { container } = render(<RecorderPanel onCaptured={onCaptured} />);

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, new File(['x'], 'note.webm', { type: 'audio/webm' }));

    expect(onCaptured).toHaveBeenCalledWith(
      expect.objectContaining({ filename: 'note.webm', url: 'blob:test' })
    );
  });
});

describe('a finished recording', () => {
  it('is handed up once it is ready', () => {
    recorder.recState = 'recorded';
    recorder.blob = new Blob(['x'], { type: 'audio/webm' });
    recorder.audioURL = 'blob:recorded';
    recorder.recSecs = 12;
    const onCaptured = vi.fn();

    render(<RecorderPanel onCaptured={onCaptured} />);

    expect(onCaptured).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'blob:recorded', seconds: 12 })
    );
  });

  it('can be discarded, clearing it upstream too', async () => {
    const user = userEvent.setup();
    recorder.recState = 'recorded';
    recorder.blob = new Blob(['x'], { type: 'audio/webm' });
    recorder.audioURL = 'blob:recorded';
    const onCaptured = vi.fn();
    render(<RecorderPanel onCaptured={onCaptured} />);

    await user.click(screen.getByRole('button', { name: /discard/i }));

    expect(recorder.discard).toHaveBeenCalled();
    expect(onCaptured).toHaveBeenLastCalledWith(null);
  });
});
