import React from "react"

type StepIndicatorProps = {
  currentStep: number
  steps: {
    id: number
    label: string
    icon: React.ReactNode
  }[]
}

export default function StepIndicator({ currentStep, steps }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-between w-full py-6 px-4 bg-gray-100">
      {steps.map((step, index) => (
        <React.Fragment key={step.id}>
          <div className="flex flex-col items-center">
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center ${
                step.id <= currentStep ? "bg-primary" : "bg-gray-300"
              }`}
            >
              <div className="text-white">{step.icon}</div>
            </div>
            <div className="mt-2 text-center">
              <div className="font-bold">Step {step.id}</div>
              <div className="text-gray-500">{step.label}</div>
            </div>
          </div>
          {index < steps.length - 1 && (
            <div className={`flex-grow h-0.5 mx-2 ${step.id < currentStep ? "bg-primary" : "bg-gray-300"}`}></div>
          )}
        </React.Fragment>
      ))}
    </div>
  )
}
