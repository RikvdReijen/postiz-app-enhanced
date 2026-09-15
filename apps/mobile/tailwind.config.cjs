/**
 * A deliberate subset of the web app's tokens. The phone only needs the surface
 * colours, and keeping the names identical means a component can be lifted from
 * apps/frontend without renaming every class.
 */
module.exports = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        newBgColor: 'var(--new-bgColor)',
        newBgColorInner: 'var(--new-bgColorInner)',
        newBgLineColor: 'var(--new-bgLineColor)',
        newBorder: 'var(--new-border)',
        newTextColor: 'rgb(var(--new-textColor) / <alpha-value>)',
        textItemBlur: 'var(--new-textItemBlur)',
        btnPrimary: 'var(--new-btn-primary)',
        btnSimple: 'var(--new-btn-simple)',
        boxHover: 'var(--new-box-hover)',
        ai: 'var(--new-ai-btn)',
      },
    },
  },
  plugins: [],
};
