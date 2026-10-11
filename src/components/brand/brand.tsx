import { Heart } from "lucide-react";
import { useId } from "react";
import { wishlistWordmarkPath } from "@/assets/branding/wishlist-wordmark";
import styles from "./brand.module.css";

type BrandProps = {
  variant?: "header" | "footer";
};

export function Brand({ variant = "header" }: BrandProps) {
  const pathId = useId();

  return (
    <span className={`${styles.brand} ${styles[variant]}`}>
      <Heart className={styles.heart} size={24} aria-hidden="true" />
      <svg
        className={styles.wordmark}
        viewBox="-3 -3 569 117"
        width={569}
        height={117}
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <path id={pathId} d={wishlistWordmarkPath} />
        </defs>
        {variant === "footer" && (
          <g className={styles.depth}>
            {Array.from({ length: 10 }, (_, index) => (
              <use
                key={index}
                href={`#${pathId}`}
                transform={`translate(${index * 0.7} ${index * 0.9})`}
              />
            ))}
          </g>
        )}
        <use href={`#${pathId}`} className={styles.face} />
      </svg>
      <span className={styles.name}>Wishlist</span>
    </span>
  );
}
