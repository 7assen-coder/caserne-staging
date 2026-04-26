export function drawerNavLinkClass(isActive) {
  return `flex items-center justify-center gap-2 rounded-lg px-2 py-2 text-sm font-semibold transition sm:px-3 ${
    isActive
      ? 'bg-white text-navy-900 shadow-sm ring-1 ring-inset ring-slate-900/10'
      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
  }`;
}

export function stripNavLinkClass(isActive) {
  return isActive
    ? 'z-[1] bg-white text-navy-900'
    : 'z-0 text-slate-500 hover:bg-slate-100 hover:text-slate-900';
}
