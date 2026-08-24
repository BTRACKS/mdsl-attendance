const getGreeting = (hour) => {
  if (hour >= 5 && hour < 12) {
    return { text: 'Good morning', icon: 'morning' };
  }
  if (hour >= 12 && hour < 17) {
    return { text: 'Good afternoon', icon: 'afternoon' };
  }
  return { text: 'Good evening', icon: 'evening' };
};

const icons = {
  morning: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 14a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"/><path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/><path d="M4 20h16"/></svg>`,
  afternoon: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="5"/><path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>`,
  evening: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"/></svg>`
};

const updateGreeting = (name = 'Oladapo') => {
  const hour = new Date().getHours();
  const { text, icon } = getGreeting(hour);
  const firstName = name.trim().split(' ')[0];
  const textEl = document.querySelector('.greeting-text');
  const iconEl = document.querySelector('.greeting-icon');

  if (textEl) {
    textEl.textContent = `${text}, ${firstName}`;
  }
  if (iconEl) {
    iconEl.innerHTML = icons[icon];
  }
};

updateGreeting();
