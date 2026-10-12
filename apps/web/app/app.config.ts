export default defineAppConfig({
  ui: {
    colors: {
      primary: 'orange',
      neutral: 'slate',
    },
    button: {
      compoundVariants: [
        {
          color: 'primary',
          variant: 'solid',
          class: '!text-slate-900 font-semibold',
        },
      ],
    },
  },
});
