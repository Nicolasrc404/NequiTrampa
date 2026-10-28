import { useState } from 'react';
import { getModule1Number, getModule1Section, getNextModule1Screen } from '../data/demoModule1';
import { Module1DemoActions, Module1DemoState, Module1ScreenKey } from '../types/module1';

export function useModule1Demo(
  screenKey: Module1ScreenKey,
  onNavigate: (key: Module1ScreenKey) => void,
): Module1DemoState & Module1DemoActions {
  const section = getModule1Section(screenKey);
  const number = getModule1Number(screenKey);
  const [value, setValue] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [enabled, setEnabled] = useState(number % 2 === 1);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const submit = () => {
    const needsValue = (section === 'Access' && number === 1) || (section === 'Profile' && number === 3);
    if (needsValue && !value.trim()) {
      setSubmitted(true);
      return;
    }
    if (section === 'Configuration' && number === 4) {
      setModalOpen(true);
      return;
    }
    setSubmitted(true);
    onNavigate(section === 'Projection_Status' && number === 1 ? 'Projection_Status_02' : getNextModule1Screen(screenKey));
  };

  return {
    value,
    showSecret,
    enabled,
    modalOpen,
    submitted,
    setValue,
    toggleSecret: () => setShowSecret((current) => !current),
    setEnabled,
    openModal: () => setModalOpen(true),
    closeModal: () => setModalOpen(false),
    submit,
  };
}
