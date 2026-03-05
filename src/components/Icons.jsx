import {
  PlayIcon,
  PauseIcon,
  StopIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowPathIcon,
  CheckIcon,
  XMarkIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  SpeakerWaveIcon,
  MicrophoneIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/20/solid";

// Shared sizing: "sm" for inline text, "md" for buttons, "lg" for circle buttons
const SIZE = {
  sm: "w-4 h-4",
  md: "w-5 h-5",
  lg: "w-6 h-6",
};

function wrap(Icon, size = "sm", className = "") {
  return <Icon className={`${SIZE[size]} inline-block shrink-0 ${className}`} />;
}

export const IconPlay       = ({ size = "sm", className = "" }) => wrap(PlayIcon, size, className);
export const IconPause      = ({ size = "sm", className = "" }) => wrap(PauseIcon, size, className);
export const IconStop       = ({ size = "sm", className = "" }) => wrap(StopIcon, size, className);
export const IconRecord     = ({ size = "sm", className = "" }) => (
  <span className={`inline-block shrink-0 rounded-full bg-current ${SIZE[size]} ${className}`} />
);
export const IconBack       = ({ size = "sm", className = "" }) => wrap(ArrowLeftIcon, size, className);
export const IconArrow      = ({ size = "sm", className = "" }) => wrap(ArrowRightIcon, size, className);
export const IconRefresh    = ({ size = "sm", className = "" }) => wrap(ArrowPathIcon, size, className);
export const IconCheck      = ({ size = "sm", className = "" }) => wrap(CheckIcon, size, className);
export const IconClose      = ({ size = "sm", className = "" }) => wrap(XMarkIcon, size, className);
export const IconUp         = ({ size = "sm", className = "" }) => wrap(ChevronUpIcon, size, className);
export const IconDown       = ({ size = "sm", className = "" }) => wrap(ChevronDownIcon, size, className);
export const IconSpeaker    = ({ size = "sm", className = "" }) => wrap(SpeakerWaveIcon, size, className);
export const IconMic        = ({ size = "sm", className = "" }) => wrap(MicrophoneIcon, size, className);
export const IconWarn       = ({ size = "sm", className = "" }) => wrap(ExclamationTriangleIcon, size, className);
