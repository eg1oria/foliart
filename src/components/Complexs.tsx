import Image from 'next/image';
import { useTranslations } from '@/lib/mock-intl'; // TODO: вернуть 'next-intl'

export default function Complexs() {
  const t = useTranslations('Complexs');
  return (
    <section className="px-90 py-20 flex items-center justify-between gap-18 relative">
      <div
        className="absolute inset-0 bg-cover bg-[center_calc(10%+200px)] bg-no-repeat opacity-50 pointer-events-none"
        style={{ backgroundImage: "url('/complex.png')" }}
      />
      <Image src="/complex1.jpeg" alt="" width={450} height={300} className="-mt-25 relative" />
      <div className="">
        <h2 className="text-5xl font-bold mt-10 text-start">{t('title')}</h2>
        <p className="text-start text-xl text-black/75 mt-6 max-w-2xl">{t('desc1')}</p>
        <p className="text-start  text-black mt-6 max-w-2xl">{t('desc2')}</p>
      </div>
    </section>
  );
}
