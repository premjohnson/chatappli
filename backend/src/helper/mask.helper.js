const maskEmail = (email) => {
  const [name, domain] = email.split('@');

  if (!name || !domain) return 'invalid-email';

  return `${name.slice(0, 2)}***@${domain}`;
};

export default maskEmail;