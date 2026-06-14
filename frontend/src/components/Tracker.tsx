import dynamic from 'next/dynamic';

const Tracker = dynamic(() => import('./TrackerClient'), { ssr: false });

export default Tracker;
