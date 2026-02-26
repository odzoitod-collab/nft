import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  isLoading?: boolean;
}

const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  isLoading = false, 
  className = '', 
  disabled,
  ...props 
}) => {
  const baseStyles = "px-4 py-2.5 rounded-xl font-medium transition-all active:scale-95 flex items-center justify-center gap-2";
  
  const variants = {
    primary: "bg-tg-button text-white hover:bg-blue-500",
    secondary: "bg-tg-card text-tg-text hover:bg-gray-700",
    outline: "border border-tg-button text-tg-button hover:bg-tg-button/10",
    ghost: "text-tg-hint hover:text-tg-text hover:bg-white/5"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${className} ${disabled || isLoading ? 'opacity-50 cursor-not-allowed active:scale-100' : ''}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full block"></span>
      ) : children}
    </button>
  );
};

export default Button;