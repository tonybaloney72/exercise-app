/** Static copy for Settings → About the developer (visible to guests and signed-in users). */

export const DEVELOPER_NAME = "Anthony Bologna";

export const DEVELOPER_TAGLINE =
  "I'm investing in ME - get it? MyExercise is ME.";

export const DEVELOPER_BIO =
  "I am a software developer passionate about both user and developer experience who works tirelessly to create friendly, polished websites. With an eye for detail, a desire to grow, and a passion for building products that help people in their day-to-day life, I believe I can contribute at a high level to any team - no matter the challenge.";

export type DeveloperLink = {
  label: string;
  href: string;
};

export const DEVELOPER_LINKS: DeveloperLink[] = [
  { label: "GitHub", href: "https://github.com/tonybaloney72" },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/anthony-michael-bologna/",
  },
  {
    label: "Portfolio",
    href: "https://anthony-bologna-portfolio.vercel.app/",
  },
];

/** Open profile links in a new tab with noopener. */
export const DEVELOPER_LINKS_NEW_TAB = true;
