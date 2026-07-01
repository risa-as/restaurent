import { CheckCircle2 } from 'lucide-react';
import React from 'react';

type Step = {
    id: number;
    title: string;
    path: string;
};

const steps: Step[] = [
    { id: 1, title: 'بيانات المطعم', path: '/register' },
    { id: 2, title: 'بيانات المالك', path: '/register/owner' },
    { id: 3, title: 'خطة الاشتراك', path: '/register/plan' },
];

export function WizardSteps({ currentStep }: { currentStep: number }) {
    return (
        <div className="w-full max-w-3xl mx-auto mb-8">
            <div className="flex justify-between items-center relative">
                {/* Connecting line */}
                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gray-200 dark:bg-slate-700 -z-10 -translate-y-1/2 rounded-full" />

                {steps.map((step) => {
                    const isCompleted = step.id < currentStep;
                    const isCurrent = step.id === currentStep;

                    return (
                        <div key={step.id} className="flex flex-col items-center bg-gray-50 dark:bg-slate-900 px-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 mb-2 bg-white dark:bg-slate-800 transition-colors ${isCompleted ? 'border-orange-600 text-orange-600' :
                                    isCurrent ? 'border-orange-500 text-orange-500 ring-4 ring-orange-100 dark:ring-orange-900/30' :
                                        'border-gray-300 dark:border-slate-600 text-gray-400 dark:text-gray-500'
                                }`}>
                                {isCompleted ? <CheckCircle2 className="w-6 h-6" /> : <span className="font-bold">{step.id}</span>}
                            </div>
                            <span className={`text-sm font-medium ${isCurrent ? 'text-orange-600 font-bold' :
                                    isCompleted ? 'text-gray-900 dark:text-white' :
                                        'text-gray-500'
                                }`}>
                                {step.title}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
