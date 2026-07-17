# Автоматична задача — попълване на материали

## Контекст
Работим по образователен сайт razberi.me.
Главният файл: `/Users/kiril/Downloads/ai-tutor-basic-site 4/lessons/materiali.html`

В него има два обекта:
- `RECHNIK` — речник на термините, структура: `{ term, def, example }`
- `USTEN` — въпроси за устен изпит, структура: `{ q, a }`

## Инструкция

1. Прочети файла и провери кои slugове ЛИПСВАТ в `RECHNIK` и `USTEN`
2. Попълни САМО липсващите — не пипай вече попълненото
3. Пиши само на български, точни учебни данни за матура/НВО
4. Не деплоирай — само редактирай файла локално

## Slugове за попълване (провери кои липсват)

### БЕЛ 11 клас — RECHNIK (по 6 термина) и USTEN (по 7 въпроса)
- bel11-vazov-pod-igoto
- bel11-vazov-epopea
- bel11-vazov-opalchentsite
- bel11-vazov-paisiy
- bel11-vazov-tih-byal-dunav
- bel11-botev-hadzhi-dimityr
- bel11-botev-obesa
- bel11-yavorov-gradushka
- bel11-slaveykov-cis-moll
- bel11-aleko-bay-ganyo
- bel11-elin-pelin-andreshko
- bel11-talev-zhelezniyat-svetilnik
- bel11-stanev-kradetsat
- bel11-stratiev-sako
- bel11-smirnanski-yohan
- bel11-vaptsarov-istoriya
- bel11-radichkov-nezhnata-spirala

### БЕЛ 7 клас — RECHNIK (по 5 термина) и USTEN (по 5 въпроса)
- bel7-narodno-tvorchestvo
- bel7-vazov-opalchentsite
- bel7-vazov-pod-igoto
- bel7-botev-maytse-si
- bel7-botev-hadzhi-dimityr
- bel7-aleko-bay-ganyo
- bel7-yovkov-indzhe
- bel7-elin-pelin-zadusha

## Формат (виж bel12 за пример)

```js
RECHNIK['bel11-vazov-pod-igoto'] = [
  { term: 'Роман', def: 'Голям епически жанр...', example: 'Цитат от текста' },
  ...
];

USTEN['bel11-vazov-pod-igoto'] = [
  { q: 'Каква е темата на романа?', a: 'Темата е...' },
  ...
];
```
