# Задача: редактирование фотографий сайта через админку

## Цель

Сейчас ~24 изображения зашиты в код как пути к файлам в `frontend/public`
(`/hero.webp`, `/advantage1.webp` и т. д.). Их нельзя поменять без деплоя.
Нужно завести раздел «Изображения сайта» в админке, где каждое такое фото
можно заменить загрузкой нового файла и вернуть исходное.

## ГЛАВНОЕ ОГРАНИЧЕНИЕ

**Публичный сайт после этой работы должен выглядеть и вести себя ровно так же,
как сейчас — пиксель в пиксель.** Пока в админку ничего не загружено, все
страницы показывают те же самые файлы из `frontend/public`. Это рефакторинг
источника пути к картинке, а не редизайн.

Отсюда следуют жёсткие правила:

- НЕ менять вёрстку, классы Tailwind, размеры, `sizes`, `priority`, `alt`,
  порядок элементов — ничего, кроме значения `src`.
- НЕ трогать логотипы: `/logo-ru.webp`, `/logo-en.webp`, `/logo-small.webp` и
  `frontend/src/lib/logo.ts`. Логотип остаётся статикой. Это явное решение.
- НЕ удалять файлы из `frontend/public` — они остаются дефолтами и страховкой.
- НЕ проводить попутных рефакторингов, не переименовывать существующее, не
  «улучшать» соседний код. Только то, что нужно для задачи.
- Если бэкенд недоступен или в базе пусто — сайт обязан отрендериться на
  дефолтах, без ошибки. Хиро рендерится в layout, падение положит весь сайт.

## Стиль работы

Проект аккуратный и последовательный. Действуй так:

1. **Сначала прочитай образцы, потом пиши.** Ниже указано, какой файл является
   эталоном для каждого куска. Копируй их структуру, именование и подход, а не
   изобретай свой.
2. **Комментарии — только содержательные, объясняющие «почему», а не «что».**
   В проекте принят именно такой стиль (посмотри комментарии в
   `backend/src/partners/partners.controller.ts` и
   `frontend/next.config.ts`). Не засоряй код очевидными подписями.
3. **Тесты.** На каждый модуль бэкенда в проекте есть `.spec.ts`, на серверные
   экшены фронта — `actions.test.ts`. Напиши их и для нового кода.
4. **Иди этапами** из плана ниже. После каждого этапа прогоняй сборку/линт/тесты
   и убеждайся, что сайт цел. Не начинай следующий этап на сломанном.
5. Если по ходу обнаружишь, что мой план в какой-то детали не сходится с
   реальным кодом — остановись и скажи, а не подгоняй код под план.

## Стек

- Бэкенд: NestJS + Prisma (SQLite), `backend/`
- Фронт: Next.js App Router + next-intl + Tailwind, `frontend/`
- Локали: `ru`, `en`, `fr`, `es`
- `/media/*` — rewrite на бэкенд `/images/*` (см. `frontend/next.config.ts`),
  тот же origin. Поэтому `remotePatterns` не нужен и CSP `img-src 'self'`
  уже покрывает загруженные картинки.

---

# Этап 1. Бэкенд

## 1.1 Модель

В `backend/prisma/schema.prisma`:

    model SiteImage {
      key       String   @id
      imageUrl  String
      width     Int      @default(0)
      height    Int      @default(0)
      revision  Int      @default(0)
      updatedAt DateTime @updatedAt
    }

`width`/`height` обязательны: большинство слотов рендерятся не через `fill`, а
с явными `width`/`height` (иконки хиро, блоки преимуществ, `specialist`,
`complex1`). Без сохранённых размеров загруженное фото другой пропорции даст
искажение или layout shift. `sharp` знает размеры в момент обработки — забери
их оттуда.

Миграцию положи рядом с существующими, по их формату именования (см.
`backend/prisma/migrations/20260910120000_certificates`).

## 1.2 Модуль `backend/src/site-images/`

Эталоны для копирования:
- структура «одна сущность + revision + сброс на дефолт» —
  `backend/src/ui-messages/` (сервис, контроллер, модуль, валидация, спеки)
- приём файла, оптимизация, удаление старого —
  `backend/src/partners/partners.controller.ts`
- утилита обработки — `backend/src/images/image-upload.util.ts`
  (`optimizeUploadedImage` принимает `{ maxDimension, quality }`)

Эндпоинты:

- `GET /api/site-images` — публичный. Отдаёт **весь набор одним объектом**
  (`{ [key]: { imageUrl, width, height, updatedAt } }`). Один запрос на рендер,
  не N запросов по ключам.
- `PUT /api/site-images/:key` — `@UseGuards(AdminApiGuard)` + `FileInterceptor`.
  Файлы в `backend/images/site/`.
- `DELETE /api/site-images/:key` — сброс на дефолт: удалить строку из БД и
  файл с диска.

Валидация в `site-images.validation.ts`: ключ по маске `^[a-z0-9-]{1,64}$`,
mime только из `allowedImageMimeTypes`, размер по `maxImageUploadBytes`.

### ГРАБЛИ 1: имя файла

Имя загруженного файла — `${Date.now()}-${key}.webp`. **Никогда не
перезаписывай файл по тому же пути.** В `frontend/next.config.ts` стоит
`minimumCacheTTL: 604800` — при перезаписи по прежнему URL новая картинка не
появится у посетителей неделю. Новая загрузка = новое имя + удаление старого
файла (ровно как сделано с логотипами партнёров).

### ГРАБЛИ 2: удаление только своих файлов

Как и в `partners.controller.ts`, удалять с диска можно **только** файлы,
которые лежат под префиксом `site/`. Дефолты живут во фронтовом `public` и не
должны пострадать ни при каких обстоятельствах.

## 1.3 Регистрация и права

- Зарегистрируй `SiteImagesModule` в `backend/src/app.module.ts`.
- Добавь `'site-images'` в `ADMIN_SECTIONS` в `backend/src/admin-sections.ts`.

### ГРАБЛИ 3: список секций продублирован

Секции объявлены **в двух местах**, и оба надо обновить синхронно:

- `backend/src/admin-sections.ts` → `ADMIN_SECTIONS`
- `frontend/src/lib/adminPermissions.ts` → `adminSections`, плюс карты
  `adminSectionLabels` и `adminSectionPaths` (без них не соберутся типы —
  это `Record<AdminSection, ...>`)

Супер-админ получает `manage` на всё автоматически (`getAdminAccessLevel`),
так что вкладка у него появится сразу. Обычным админам доступ выдаётся
вручную через раздел «Администраторы» — это нормально, ничего доделывать не
нужно, просто упомяни это в финальном отчёте.

---

# Этап 2. Реестр слотов на фронте

Создай `frontend/src/lib/siteImages.ts` — единственный источник правды.

Форма записи (поля обязательны все):

    'home-hero': {
      default: '/hero.webp',
      group: 'home',
      label: 'Главный баннер',
      hint: 'Фон первого экрана главной страницы',
      aspect: '16/9',
      recommended: '1920×1080',
      maxDimension: 1920,
    }

`maxDimension` прокидывается в `optimizeUploadedImage` при загрузке: гнать
иконку 200×200 через ресайз до 1920 незачем.

## ВАЖНО: слоты логические, а не «один файл = один ключ»

Сейчас один файл обслуживает несколько разных мест. Если сделать ключ на файл,
человек поменяет шапку статей и с удивлением обнаружит, что поменялась и шапка
календаря. Поэтому **разным местам — разные ключи, даже если дефолт у них один
и тот же файл**. Так они смогут разойтись позже, и сюрпризов не будет.

## Полный список слотов

Группа `home` (главная):

| ключ | дефолт | где | как рендерится |
|---|---|---|---|
| home-hero | /hero.webp | Hero.tsx:33 + метаданные page.tsx:34 + seo.ts:8 | fill, priority |
| home-icon-1 | /hero-icon1.webp | Hero.tsx:15 | размеры |
| home-icon-2 | /hero-icon2.webp | Hero.tsx:19 | размеры |
| home-icon-3 | /hero-icon3.webp | Hero.tsx:23 | размеры |
| home-icon-4 | /hero-icon4.webp | Hero.tsx:27 | размеры |
| home-complex-bg | /complex.webp | Complexs.tsx:12 | CSS background-image |
| home-complex-photo | /complex1.webp | Complexs.tsx:17 | 450×300 |
| home-advantage-1 | /advantage1.webp | Advantages.tsx:10 | размеры |
| home-advantage-2 | /advantage2.webp | Advantages.tsx:16 | размеры |
| home-advantage-3 | /advantage3.webp | Advantages.tsx:24 | размеры |
| home-advantage-4 | /advantage4.webp | Advantages.tsx:31 | размеры |
| home-advantage-5 | /advantage5.webp | Advantages.tsx:39 | размеры |

Группа `about` (о компании):

| ключ | дефолт | где |
|---|---|---|
| about-hero | /about-head1.webp | about/page.tsx:44 + метаданные :31 |
| about-form-bg | /about-form.webp | about/page.tsx:110 (фон блока #feedback) |

Группа `catalog`:

| ключ | дефолт | где |
|---|---|---|
| catalog-hero | /catalog-head.webp | catalog/page.tsx:69 + метаданные :36, [categoryId]:65, [productId]:86 |
| catalog-specialist | /specialist.webp | catalog/SpecialistSection.tsx:25 |
| catalog-certificate-fallback | /sertificate.webp | [productId]/page.tsx:113 |
| search-hero | /catalog-head.webp | search/page.tsx:195 + метаданные :54 |

Группа `articles`:

| ключ | дефолт | где |
|---|---|---|
| articles-hero | /articles-head.webp | articles/page.tsx:59 + метаданные :37, [articleId]:64 |

Группа `calendar`:

| ключ | дефолт | где |
|---|---|---|
| calendar-hero | /articles-head.webp | calendar/page.tsx:44 + метаданные :31, [calendarId]:40 |

Группа `partners`:

| ключ | дефолт | где |
|---|---|---|
| partners-hero | /partners-head.webp | about/partnery/page.tsx:51 + метаданные :31 |

Группа `contacts`:

| ключ | дефолт | где |
|---|---|---|
| contacts-hero | /contacts.webp | contacts/page.tsx:70 + метаданные :26 |
| contacts-form-bg | /about-head1.webp | contacts/page.tsx:166 (фон блока #feedback) |

Группа `privacy`:

| ключ | дефолт | где |
|---|---|---|
| privacy-hero | /about-head1.webp | privacy/page.tsx:86 + метаданные :56 |

Группа `common` (сквозные):

| ключ | дефолт | где |
|---|---|---|
| footer-bg | /footer3.webp | Footer.tsx:11 |
| contact-modal | /question.webp | ContactModalTrigger.tsx:151 |

Номера строк — на момент составления задачи, проверь их перед правкой.

---

# Этап 3. Доставка значений в компоненты

- Один серверный запрос в `frontend/src/app/[locale]/layout.tsx` — там уже
  ровно так грузятся `getCategories`/`getCalendars`, встань рядом.
- В `frontend/src/lib/api.ts` добавь `getSiteImages()` и
  `siteImagesCacheTag = 'site-images'` — по образцу соседних функций с
  `withCacheTag`.
- **Серверные компоненты и `generateMetadata`** — обращаются к резолверу
  напрямую через `await`. Запрос дедуплицируется мемоизацией fetch в пределах
  одного рендера.
- **Клиентские компоненты** — провайдер в layout + хук `useSiteImage(key)`.
  Настоящий клиентский потребитель ровно один: `ContactModalTrigger.tsx`
  (`/question.webp`), он сидит в `Header` и `FullScreenMenu`. Не тащи ради
  него пропсы через полдерева — сделай провайдер.
- В `frontend/src/lib/media.ts` уже есть заглушка
  `resolvePublicAssetUrl(path)` (сейчас просто `return path`) — она заведена
  ровно под это, используй её как точку интеграции, а не плоди второй шов.

### ГРАБЛИ 4: fallback обязателен

Оберни запрос в try/catch с падением на дефолт из реестра. Образец обработки —
`certificateResult` в `frontend/src/app/[locale]/admin/certificates/page.tsx`.
Бэкенд лёг — сайт работает на встроенных картинках.

### ГРАБЛИ 5: OG-изображения

`frontend/src/lib/seo.ts:8` — `DEFAULT_OG_IMAGE = '/hero.webp'` уходит в
Open Graph. Там нужен **абсолютный** URL. Проверь, как он собирается сейчас,
и сохрани это поведение для загруженной картинки.

### ГРАБЛИ 6: LCP главной

`Hero.tsx:33` идёт с `priority` — это LCP-элемент главной. `priority` и
`sizes` обязаны остаться ровно как есть.

---

# Этап 4. Замена хардкодов

39 вхождений в 15 файлах — по таблице выше. Меняется только источник `src`.

Единственное нетипичное место — `Complexs.tsx:12`: там CSS
`background-image`, а не `next/image`. Оставь как CSS-фон, просто подставь
резолвнутый путь. **Не переводи на `next/image`** — это изменение поведения,
а нам нужен неизменный сайт.

---

# Этап 5. Админ-вкладка

Маршрут `frontend/src/app/[locale]/admin/site-images/` (`page.tsx` +
`actions.ts`).

Эталон целиком — `frontend/src/app/[locale]/admin/certificates/`: тот же
`AdminShell` / `AdminPanel` / `AdminNotice` из
`frontend/src/components/admin/AdminShell.tsx`, тот же `requireAdminSection`,
тот же возврат статуса через `redirect` с query-параметром.

Навигация: `frontend/src/components/admin/adminNav.tsx` — пункт между
«Сертификат» и «Переводы», иконка `FiImage` из `react-icons/fi`. Строки нужны
для **обеих** локалей навигации (`en` и `ru`):
- ru: «Изображения сайта» / «Фотографии на страницах публичного сайта»
- en: «Site images» / «Photos across the public site»

## Что делает вкладку удобной (это часть задачи, не украшательство)

1. Группировка по страницам с переключателем сверху: Главная · О компании ·
   Каталог · Статьи · Календарь · Партнёры · Контакты · Политика · Общие.
2. Карточка слота: превью в **реальном соотношении** (`aspect` из реестра),
   название, подпись «где это видно», рекомендуемый размер, текущее состояние
   («Загружено 10.09.2026, 1920×1080» либо «Встроенное в сайт»).
3. Загрузка перетаскиванием на превью + мгновенный локальный предпросмотр
   через `URL.createObjectURL` до отправки на сервер.
4. Кнопка «Вернуть исходное» — показывается только у заменённых слотов.
   Образец подтверждения — `AdminDeleteButton` на странице сертификата.
5. Ссылка «Посмотреть на сайте» у каждой карточки, открывает нужную страницу
   в новой вкладке.
6. Клиентская проверка типа и размера до отправки — образец
   `frontend/src/lib/certificateUpload.ts`. Незачем гонять 20 МБ ради ошибки.
7. Если пропорции загружаемого файла заметно расходятся с рекомендуемыми —
   предупредить («фото обрежется по краям»), но **не блокировать** загрузку.
8. Права: при `view` без `manage` — показывать превью, скрывать загрузку,
   ровно как это сделано на странице сертификата.

## Ревалидация кэша

В `actions.ts` после успешной загрузки/сброса — `updateTag(siteImagesCacheTag)`
плюс `revalidatePath` по всем четырём локалям. Точный образец —
`revalidateCertificatePages()` в
`frontend/src/app/[locale]/admin/certificates/actions.ts`.

---

# Этап 6. Проверка

1. `npm run lint` и `npm run build` в `frontend/`, сборка и тесты в `backend/`.
2. Тесты: `site-images.service.spec.ts` (конфликт ревизий, сброс),
   `site-images.validation.spec.ts` (маска ключа, отказ на чужом mime),
   `frontend/src/app/[locale]/admin/site-images/actions.test.ts` (образец —
   `admin/messages/actions.test.ts`).
3. **Проверка «сайт не изменился»**: подними dev-сервер и пройди с пустой
   таблицей `SiteImage` по главной, /about, /catalog, карточке товара,
   /articles, /calendar, /partnery, /contacts, /privacy, /search. Убедись, что
   всё выглядит как до правок и в консоли чисто.
4. Затем загрузи через админку заменяющее фото хотя бы в три слота разного
   типа (`home-hero` — fill+priority, `home-advantage-1` — с размерами,
   `contact-modal` — клиентский компонент) и убедись, что подменилось на сайте
   и что старый файл удалён с диска.
5. Проверь, что при выключенном бэкенде публичные страницы всё ещё рендерятся
   на дефолтах.

# Отчёт

В конце коротко перечисли: какие файлы добавлены/изменены, что проверено и
чем, и что осталось на мне (в частности — выдать обычным админам доступ к
новому разделу).
