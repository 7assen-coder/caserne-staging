export default function Button({
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconPosition = 'left',
  children,
  className = '',
  ...rest
}) {
  const variants = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    gold: 'btn-gold',
    danger: 'btn-danger',
    ghost: 'btn-ghost',
  };
  const sizes = {
    sm: 'btn-sm',
    md: '',
    lg: 'btn-lg',
  };
  return (
    <button
      className={`btn ${variants[variant] ?? ''} ${sizes[size] ?? ''} ${className}`}
      type="button"
      {...rest}
    >
      {Icon && iconPosition === 'left' ? <Icon size={size === 'sm' ? 14 : 16} /> : null}
      <span>{children}</span>
      {Icon && iconPosition === 'right' ? <Icon size={size === 'sm' ? 14 : 16} /> : null}
    </button>
  );
}
