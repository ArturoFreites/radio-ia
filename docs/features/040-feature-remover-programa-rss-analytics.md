# Feature: Remover programa, RSS y analytics
> Status: DONE
> v1 | 2026-06-12

## Why
El producto pivota a modo DJ exclusivo; hay que eliminar la experiencia de programas pregrabados, fuentes RSS en configuración y la página de analytics.

## Files

### Delete
- `src/components/aire/ModoPrograma.tsx` — ya no hay reproducción de programas en aire
- `src/components/aire/GeneracionProgresOverlay.tsx` — overlay de generación de programas
- `src/app/(dashboard)/programas/page.tsx` — listado de programas
- `src/app/(dashboard)/programas/nuevo/page.tsx` — crear programa
- `src/app/(dashboard)/programas/[id]/page.tsx` — editor de programa
- `src/app/(dashboard)/analytics/page.tsx` — analytics
- `src/app/api/programas/route.ts` — CRUD programas
- `src/app/api/programas/[id]/route.ts` — idem
- `src/app/api/programas/[id]/bloques/route.ts` — bloques
- `src/app/api/programas/[id]/estado/route.ts` — estado
- `src/app/api/programas/[id]/generar/route.ts` — generación
- `src/app/api/programas/[id]/noticias/desde-rss/route.ts` — noticias RSS
- `src/app/api/programas/[id]/preview-tts/route.ts` — preview TTS
- `src/app/api/aire/noticias/regenerar/route.ts` — regeneración post-programa

### Modify
- `prisma/schema.prisma` — quitar TipoSlot PROGRAMA; eliminar programaId/anticipacionHoras de slots; migrar slots PROGRAMA a DJ
- `src/types/grilla.ts` — ModoAire = "DJ" | "IDLE"; quitar tipo PROGRAMA de SlotHoy
- `src/components/aire/AireController.tsx` — simplificar a DJ/IDLE
- `src/components/aire/ControlsBar.tsx` — quitar controles de programa
- `src/components/grilla/SlotForm.tsx` — solo slots DJ
- `src/components/grilla/SlotPopover.tsx` — idem
- `src/components/grilla/SlotBloque.tsx` — solo estilo DJ
- `src/components/grilla/CalendarioSemanal.tsx` — quitar referencias PROGRAMA
- `src/components/grilla/GrillaEditor.tsx` — idem
- `src/components/aire/GrillaHoy.tsx` — solo DJ
- `src/components/dashboard/Sidebar.tsx` — quitar Programas y Analytics
- `src/middleware.ts` — quitar /programas y /analytics del matcher
- `src/app/(dashboard)/dashboard/page.tsx` — reemplazar UltimosProgramas
- `src/components/dashboard/ProximosSlots.tsx` — solo DJ
- `src/components/dashboard/VivoBanner.tsx` — solo DJ
- `src/components/dashboard/ConfiguracionEditor.tsx` — quitar sección RSS
- `src/app/api/configuracion/route.ts` — quitar fuentesNoticias del PATCH
- `src/types/configuracion.ts` — idem
- `src/app/(dashboard)/configuracion/page.tsx` — idem
- `src/app/api/aire/estado/route.ts` — quitar programaActivo y lógica PROGRAMA
- `src/lib/grilla/mergeDia.ts` — solo DJ
- `worker/index.ts` — quitar cron de pre-generación de programas

## Contracts

```typescript
type ModoAire = "DJ" | "IDLE";
```

Tablas `Programa`, `Bloque`, `Generacion` se conservan en DB sin UI.

## Behavior

- Sidebar no muestra Programas ni Analytics.
- Grilla solo permite crear/editar slots DJ.
- `/aire` nunca entra en modo programa.
- Configuración no muestra fuentes RSS.
- `/analytics` y `/programas` responden 404.
- Dashboard muestra próximos slots DJ en lugar de últimos programas.
- Worker deja de pre-generar programas por anticipacionHoras.

## Notes

- Migración SQL: UPDATE slots PROGRAMA → tipo DJ, programaId NULL.
- Columna `Radio.fuentesNoticias` se mantiene en DB.

## AC
- [ ] No existe enlace a Programas ni Analytics en sidebar
- [ ] Grilla solo permite crear slots DJ
- [ ] /aire nunca entra en modo programa
- [ ] Configuración no muestra fuentes RSS
- [ ] /analytics responde 404

## Changelog
- v1 (2026-06-12): Initial spec
