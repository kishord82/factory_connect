import { formatDate } from '../../utils/date.js';
import { AlertCircle, CheckCircle2, Clock } from 'lucide-react';

interface SagaEvent {
  step: number;
  state: string;
  timestamp: string;
  duration_ms: number;
  error: string | null;
}

interface SagaTimelineProps {
  events: SagaEvent[];
  currentStep?: number;
  deadline?: string;
}

const sagaStateDescriptions: Record<string, string> = {
  INITIATED: 'Order initiated',
  GATHERING_INFO: 'Gathering customer info',
  COMPLETE: 'Info complete',
  SEARCHING: 'Searching for flights',
  QUOTED: 'Quote received',
  FARE_RULES_SHOWN: 'Fare rules displayed',
  PRICE_CONFIRMED: 'Price confirmed',
  APPROVAL_PENDING: 'Awaiting approval',
  APPROVED: 'Approved',
  PASSENGER_VALIDATED: 'Passenger validated',
  BOOKING_CONFIRMED: 'Booking confirmed',
  TICKETED: 'Tickets issued',
  INVOICE_SENT: 'Invoice sent',
  COMPLETED: 'Order completed',
  CANCELLED: 'Order cancelled',
  FAILED: 'Order failed',
};

const sagaStateColors: Record<string, { bg: string; text: string; border: string }> = {
  INITIATED: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' },
  GATHERING_INFO: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
  COMPLETE: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
  SEARCHING: { bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-300' },
  QUOTED: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300' },
  FARE_RULES_SHOWN: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300' },
  PRICE_CONFIRMED: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300' },
  APPROVAL_PENDING: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300' },
  APPROVED: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
  PASSENGER_VALIDATED: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
  BOOKING_CONFIRMED: { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-300' },
  TICKETED: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
  INVOICE_SENT: { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-300' },
  COMPLETED: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
  CANCELLED: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
  FAILED: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
};

export function SagaTimeline({
  events,
  currentStep,
  deadline,
}: SagaTimelineProps) {
  if (!events || events.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500 text-sm">
        No saga events yet
      </div>
    );
  }

  const isOverDeadline = deadline && new Date(deadline) < new Date();
  const deadlineDate = deadline ? new Date(deadline) : null;

  return (
    <div className="space-y-4">
      {/* Deadline Warning */}
      {isOverDeadline && deadline && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-900">Deadline Exceeded</p>
            <p className="text-xs text-red-700">
              This order exceeded its SLA deadline on {formatDate(deadline)}
            </p>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="space-y-2">
        {events.map((event, idx) => {
          const colors = sagaStateColors[event.state] || sagaStateColors.INITIATED;
          const isCompleted = currentStep === undefined || event.step < currentStep;
          const isCurrent = event.step === currentStep;
          const isFailed = event.error !== null;

          return (
            <div key={`${event.step}-${event.state}`} className="relative">
              {/* Connector Line */}
              {idx < events.length - 1 && (
                <div
                  className={`absolute left-6 top-12 w-0.5 h-8 ${
                    isCompleted ? 'bg-green-400' : isFailed ? 'bg-red-400' : 'bg-gray-300'
                  }`}
                />
              )}

              {/* Event Node */}
              <div className="flex gap-3">
                <div className="relative flex flex-col items-center pt-1">
                  {isFailed ? (
                    <AlertCircle size={24} className="text-red-500 flex-shrink-0" />
                  ) : isCompleted ? (
                    <CheckCircle2 size={24} className="text-green-500 flex-shrink-0" />
                  ) : isCurrent ? (
                    <Clock size={24} className="text-blue-500 flex-shrink-0" />
                  ) : (
                    <div className="w-6 h-6 rounded-full border-2 border-gray-300 bg-gray-50 flex-shrink-0" />
                  )}
                </div>

                <div className="flex-1 pb-2">
                  <div className={`rounded-lg border-2 p-3 ${colors.bg} ${colors.border}`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className={`text-sm font-semibold ${colors.text}`}>
                          {sagaStateDescriptions[event.state] || event.state}
                        </p>
                        <p className={`text-xs ${colors.text} opacity-75 mt-0.5`}>
                          Step {event.step} • {formatDate(event.timestamp)}
                        </p>
                      </div>
                      {event.duration_ms > 0 && (
                        <p className={`text-xs font-medium ${colors.text}`}>
                          {(event.duration_ms / 1000).toFixed(1)}s
                        </p>
                      )}
                    </div>

                    {event.error && (
                      <div className="mt-2 p-2 bg-red-100 rounded border border-red-300">
                        <p className="text-xs text-red-700 font-medium">Error:</p>
                        <p className="text-xs text-red-700">{event.error}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* SLA Deadline Info */}
      {deadline && !isOverDeadline && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs">
          <p className="text-blue-800">
            <span className="font-medium">SLA Deadline:</span> {formatDate(deadline)}
            {deadlineDate && (
              <span className="ml-2 text-blue-700">
                ({Math.ceil((deadlineDate.getTime() - new Date().getTime()) / (1000 * 60 * 60))} hours remaining)
              </span>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
