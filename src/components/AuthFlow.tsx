import { useState } from 'react';
import RoleSelection from './RoleSelection';
import Login from './Login';
import Signup from './Signup';

type AuthStep = 'roleSelection' | 'login' | 'signup';

export default function AuthFlow() {
  const [currentStep, setCurrentStep] = useState<AuthStep>('roleSelection');
  const [selectedRole, setSelectedRole] = useState<'vendor' | 'supplier' | null>(null);

  const handleRoleSelected = (role: 'vendor' | 'supplier') => {
    setSelectedRole(role);
    setCurrentStep('login'); // Default to login after role selection
  };

  const handleSwitchToSignup = () => {
    setCurrentStep('signup');
  };

  const handleSwitchToLogin = () => {
    setCurrentStep('login');
  };

  const handleBackToRoleSelection = () => {
    setCurrentStep('roleSelection');
    setSelectedRole(null);
  };

  if (currentStep === 'roleSelection') {
    return <RoleSelection onRoleSelected={handleRoleSelected} />;
  }

  if (currentStep === 'login' && selectedRole) {
    return (
      <Login
        preSelectedRole={selectedRole}
        onSwitchToSignup={handleSwitchToSignup}
        onBackToRoleSelection={handleBackToRoleSelection}
      />
    );
  }

  if (currentStep === 'signup' && selectedRole) {
    return (
      <Signup
        preSelectedRole={selectedRole}
        onSwitchToLogin={handleSwitchToLogin}
        onBackToRoleSelection={handleBackToRoleSelection}
      />
    );
  }

  // Fallback to role selection if something goes wrong
  return <RoleSelection onRoleSelected={handleRoleSelected} />;
}
