import React from 'react';
import { User, LogOut } from 'lucide-react';

interface AuthButtonProps {
  user: { id: string; email: string };
  onSignOut: () => void;
}

const AuthButton: React.FC<AuthButtonProps> = ({ user, onSignOut }) => {
  return (
    <div className="flex items-center space-x-3">
      <div className="flex items-center space-x-2 px-3 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg">
        <User className="h-4 w-4 text-green-400" />
        <span className="text-white/80 text-sm">{user.email}</span>
      </div>
      <button
        type="button"
        onClick={onSignOut}
        className="flex items-center space-x-2 px-3 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 rounded-lg text-white/80 hover:text-white transition-all duration-200"
      >
        <LogOut className="h-4 w-4" />
        <span className="text-sm">Sign Out</span>
      </button>
    </div>
  );
};

export default AuthButton;
