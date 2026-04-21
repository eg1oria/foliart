import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { FaPhoneAlt } from 'react-icons/fa';
import { IoIosMail } from 'react-icons/io';
import { TbArrowBackUp } from 'react-icons/tb';

export default function Partners() {
  const t = useTranslations('Partners');
  return (
    <div className="">
      <div className="relative px-90 flex flex-col items-start justify-center py-14 px-6 text-center overflow-hidden pt-60">
        <Image src="/partners-head.jpg" alt="" fill className="object-cover -z-10 scale-120" />
        <div className="absolute inset-0 bg-black/50 -z-10" />
        <h1
          className="font-bold text-white mb-4"
          style={{
            fontSize: 55,
          }}>
          {t('title')}
        </h1>
      </div>

      <div className="px-93 py-16 flex gap-12 ">
        <div className="p-8 border-5 border-gray-400 flex flex-col items-center gap-4 text-center min-w-[260px]">
          <Image src="/partners2.png" alt="Партнер 1" width={220} height={150} />
          <p className="text-blue-600 font-medium">ООО &quot;ЭкоГрин&quot;</p>
          <span className="text-black/65 font-bold">г.Краснодар</span>
          <a
            href="tel:+78612247537"
            className="text-blue-500 hover:underline flex items-center gap-2">
            <FaPhoneAlt className="inline-block text-black" />
            +7 (861) 224-75-37
          </a>
          <a
            href="tel:+79898024378"
            className="text-blue-500 hover:underline flex items-center gap-2">
            <FaPhoneAlt className="inline-block text-black" />
            +7 (989) 802 43 78
          </a>
          <a
            href="mailto:info@ecogreen.ru"
            className="text-blue-500 hover:underline flex items-center gap-2">
            <IoIosMail className="inline-block text-black" />
            info@ecogreen.ru
          </a>
          <a
            href="https://ecogreen.ru"
            className="text-blue-500 hover:underline flex items-center gap-2">
            <TbArrowBackUp className="inline-block scale-x-[-1] text-black" />
            https://ecogreen.ru
          </a>
        </div>
        <div className="p-8 border-5 pb-20 border-gray-400 flex flex-col items-center gap-4 text-center min-w-[260px]">
          <Image src="/partners1.png" alt="Партнер 2" width={120} height={150} />
          <p className="text-blue-600 font-medium">ООО &quot;Империя Агро Крым&quot;</p>
          <span className="text-black/65 font-bold">г. Симферополь</span>
          <a
            href="tel:+79787701041"
            className="text-blue-500 hover:underline flex items-center gap-2 mt-auto">
            <FaPhoneAlt className="inline-block text-black" />
            +7 (978) 770-10-41
          </a>
          <a
            href="mailto:iimperia-agro-Crimea@mail.ru"
            className="text-blue-500 hover:underline flex items-center gap-2">
            <IoIosMail className="inline-block text-black" />
            iimperia-agro-Crimea@mail.ru
          </a>
        </div>
      </div>
    </div>
  );
}
