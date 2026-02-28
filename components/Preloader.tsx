import React from 'react';

interface PreloaderProps {
  visible: boolean;
}

const Preloader: React.FC<PreloaderProps> = ({ visible }) => {
  return (
    <div
      id="preloader"
      className={`preloader${visible ? '' : ' preloader-is-hidden'}`}
      aria-hidden={!visible}
    >
      <div className="preloader-content">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 200 200"
          width={120}
          height={120}
          className="preloader-svg"
          aria-hidden
        >
          <defs>
            <style>
              {`
                .preloader-svg .bg-track {
                  fill: none;
                  stroke: var(--preloader-track, rgba(255, 255, 255, 0.06));
                  stroke-width: 14;
                  stroke-linejoin: miter;
                  stroke-miterlimit: 4;
                }
                .preloader-svg .white-runner {
                  fill: none;
                  stroke: var(--preloader-white, #ffffff);
                  stroke-width: 14;
                  stroke-linejoin: miter;
                  stroke-miterlimit: 4;
                  stroke-dasharray: 120 346;
                  stroke-linecap: butt;
                  animation: preloader-trace 2.4s cubic-bezier(0.4, 0, 0.2, 1) infinite;
                }
                .preloader-svg .blue-runner {
                  fill: none;
                  stroke: var(--preloader-blue, #0091ff);
                  stroke-width: 14;
                  stroke-linejoin: miter;
                  stroke-miterlimit: 4;
                  stroke-dasharray: 40 426;
                  stroke-linecap: butt;
                  animation: preloader-trace-blue 2.4s cubic-bezier(0.4, 0, 0.2, 1) infinite;
                  filter: var(--preloader-glow, drop-shadow(0px 0px 6px rgba(0, 145, 255, 0.6)));
                }
                .preloader-svg .inner-block {
                  fill: var(--preloader-white, #ffffff);
                }
                .preloader-svg .inner-blue {
                  fill: var(--preloader-blue, #0091ff);
                  filter: var(--preloader-glow, drop-shadow(0px 0px 6px rgba(0, 145, 255, 0.6)));
                }
                .preloader-svg .pulse-1 { animation: preloader-pulse 1.6s ease-in-out infinite; }
                .preloader-svg .pulse-2 { animation: preloader-pulse 1.6s ease-in-out infinite 0.2s; }
                .preloader-svg .pulse-3 { animation: preloader-pulse 1.6s ease-in-out infinite 0.4s; }
                .preloader-svg .pulse-blue { animation: preloader-pulse-blue 1.6s ease-in-out infinite 0.1s; }
                @keyframes preloader-trace {
                  0% { stroke-dashoffset: 466; }
                  100% { stroke-dashoffset: 0; }
                }
                @keyframes preloader-trace-blue {
                  0% { stroke-dashoffset: 556; }
                  100% { stroke-dashoffset: 90; }
                }
                @keyframes preloader-pulse {
                  0%, 100% { opacity: 0.15; }
                  50% { opacity: 1; }
                }
                @keyframes preloader-pulse-blue {
                  0%, 100% { opacity: 0.3; }
                  50% { opacity: 1; }
                }
                @media (prefers-color-scheme: light) {
                  .preloader-svg .bg-track {
                    stroke: var(--preloader-track-light, rgba(0, 0, 0, 0.08));
                  }
                  .preloader-svg .white-runner { stroke: #141416; }
                  .preloader-svg .inner-block { fill: #141416; }
                  .preloader-svg .blue-runner { stroke: #0091ff; }
                  .preloader-svg .inner-blue { fill: #0091ff; }
                  .preloader-svg .blue-runner,
                  .preloader-svg .inner-blue { filter: none; }
                }
              `}
            </style>
          </defs>
          <path
            className="bg-track"
            d="M 70 30 L 130 30 L 170 70 L 170 130 L 130 170 L 70 170 L 30 130 L 30 70 Z"
          />
          <path
            className="white-runner"
            d="M 70 30 L 130 30 L 170 70 L 170 130 L 130 170 L 70 170 L 30 130 L 30 70 Z"
          />
          <path
            className="blue-runner"
            d="M 70 30 L 130 30 L 170 70 L 170 130 L 130 170 L 70 170 L 30 130 L 30 70 Z"
          />
          <g>
            <rect className="inner-block pulse-1" x={75} y={75} width={25} height={10} />
            <rect className="inner-blue pulse-blue" x={110} y={75} width={10} height={10} />
            <rect className="inner-block pulse-2" x={75} y={95} width={45} height={10} />
            <rect className="inner-block pulse-3" x={75} y={115} width={25} height={10} />
          </g>
        </svg>
        <p className="preloader-text">Загрузка активов...</p>
      </div>
    </div>
  );
};

export default Preloader;
