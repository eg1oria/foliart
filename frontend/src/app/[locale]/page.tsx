import Advantages from '@/components/Advantages';
import Complexs from '@/components/Complexs';
import Hero from '@/components/Hero';
import { useTranslations } from 'next-intl';

export default function Home() {
  const t = useTranslations('Home');
  return (
    <>
      <Hero />
      <Complexs />
      <Advantages />
      <button className="flex w-fit rounded-full bg-[#074031] mx-auto px-8 py-5 mt-10 mb-20 text-white">
        {t('catalogButton')}
      </button>
    </>
  );
}
