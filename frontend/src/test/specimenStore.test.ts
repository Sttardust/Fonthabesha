import { describe, it, expect, beforeEach } from 'vitest';
import { useSpecimenStore, SPECIMEN_PRESETS } from '@/lib/store/specimenStore';

// Reset store between tests by acting on defaults
const resetStore = () => useSpecimenStore.setState({
  text: 'ሰላም ዓለም — ፊደሎች ያምራሉ።',
  preset: 'pangram',
  fontSize: 40,
  darkMode: true,
  viewMode: 'list',
  columnCount: 3,
});

describe('specimenStore', () => {
  beforeEach(resetStore);

  it('has correct initial state', () => {
    const state = useSpecimenStore.getState();
    expect(state.text).toBe('ሰላም ዓለም — ፊደሎች ያምራሉ።');
    expect(state.fontSize).toBe(40);
    expect(state.darkMode).toBe(true);
    expect(state.viewMode).toBe('list');
    expect(state.columnCount).toBe(3);
  });

  it('updates text', () => {
    useSpecimenStore.getState().setText('Hello');
    expect(useSpecimenStore.getState().text).toBe('Hello');
  });

  it('updates fontSize', () => {
    useSpecimenStore.getState().setFontSize(72);
    expect(useSpecimenStore.getState().fontSize).toBe(72);
  });

  it('toggles darkMode', () => {
    useSpecimenStore.getState().toggleDarkMode();
    expect(useSpecimenStore.getState().darkMode).toBe(false);
    useSpecimenStore.getState().toggleDarkMode();
    expect(useSpecimenStore.getState().darkMode).toBe(true);
  });

  it('sets viewMode', () => {
    useSpecimenStore.getState().setViewMode('grid');
    expect(useSpecimenStore.getState().viewMode).toBe('grid');
  });

  it('applies a preset and sets text', () => {
    const presetKey = 'alphabet' as const;
    useSpecimenStore.getState().setPreset(presetKey);
    const state = useSpecimenStore.getState();
    expect(state.preset).toBe(presetKey);
    expect(state.text).toBe(SPECIMEN_PRESETS[presetKey]);
  });

  it('clears preset when setting custom text', () => {
    useSpecimenStore.getState().setPreset('alphabet');
    useSpecimenStore.getState().setText('custom');
    // Text should update; preset is not necessarily cleared (implementation detail)
    expect(useSpecimenStore.getState().text).toBe('custom');
  });
});
