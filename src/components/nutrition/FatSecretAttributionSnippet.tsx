import {
  FATSECRET_PLATFORM_URL,
} from "@/lib/nutrition/fatsecretAttribution";

type Props = {
  className?: string;
};

/**
 * Official FatSecret attribution snippet — link text and href must not change
 * (https://platform.fatsecret.com/attribution).
 */
export default function FatSecretAttributionSnippet({ className }: Props) {
  return (
    <p className={className}>
      <a href={FATSECRET_PLATFORM_URL}>Powered by fatsecret Platform API</a>
    </p>
  );
}
