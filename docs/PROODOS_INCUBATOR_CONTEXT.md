# Proodos e contexto operacional das incubadoras

## Modelo adotado

`organizations` continua sendo a fronteira técnica de tenant. Nesta implantação, o tenant principal é o **Proodos**. `incubators` representa as unidades operacionais administradas pelo Proodos.

```text
Proodos (organização)
└── Incubadora
    ├── Programas
    │   └── Turmas
    ├── Startups
    ├── Diagnósticos
    ├── Planos de ação
    ├── Mentorias
    ├── Conteúdos e trilhas
    └── Indicadores
```

## Navegação

- `/o`: administração consolidada do Proodos e ciclo de vida das incubadoras.
- `/o/proodos/i/[incubatorSlug]/dashboard`: entrada operacional da incubadora.
- Os módulos operacionais repetem o prefixo com `incubatorSlug` explícito.
- Rotas legadas sem incubadora redirecionam para uma incubadora ativa autorizada.

A URL é contexto de navegação, não mecanismo de autorização. O servidor consulta organização e incubadora através do cliente autenticado e rejeita qualquer recurso que a RLS não devolva.

## Ciclo de vida

- Incubadora sem vínculos: exclusão lógica (`status = inactive`, `deleted_at` preenchido).
- Incubadora com programas, startups, tipos próprios, arquivos, atribuições ou convites: somente arquivamento.
- Incubadora arquivada: pode ser reativada por administrador organizacional.
- A operação é transacional na função `manage_incubator_lifecycle`.

## Identidade

- A central administrativa usa a marca Proodos.
- O shell operacional identifica a incubadora ativa.
- A Incubadora Sertão Maker mantém sua marca própria no ambiente operacional.

## Próximos módulos

Diagnósticos e planos de ação terão `startup_id` obrigatório e herdarão a incubadora da startup. Mentorias terão atribuição por incubadora. Templates, conteúdos e trilhas poderão ter escopo global Proodos ou escopo privado de incubadora, sem dependência obrigatória de CERNE.
