import { motion } from "motion/react";
import { useTranslation, Trans } from "react-i18next";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  UserIcon,
  ZapIcon,
  ShieldKeyIcon,
  InfinityCircleIcon,
} from "@hugeicons/core-free-icons";

export function FeaturesSection() {
  const { t } = useTranslation();

  const features = [
    {
      id: "humans",
      icon: UserIcon,
      title: t("features.built_for_humans.title"),
      desc: t("features.built_for_humans.desc"),
    },
    {
      id: "ephemeral",
      icon: InfinityCircleIcon,
      title: t("features.ephemeral.title"),
      desc: t("features.ephemeral.desc"),
    },
    {
      id: "no-limits",
      icon: ZapIcon,
      title: t("features.no_limits.title"),
      desc: t("features.no_limits.value"),
      isHighlight: true,
    },
    {
      id: "e2ee",
      icon: ShieldKeyIcon,
      title: t("features.e2ee.title"),
      desc: (
        <div className="space-y-4">
          <p>{t("features.e2ee.desc1")}</p>
          <p className="text-sm opacity-60 italic">{t("features.e2ee.desc2")}</p>
        </div>
      ),
    },
  ];

  return (
    <section className="py-32 px-6 sm:px-12 lg:px-24 relative z-10">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
          {features.map((feature, idx) => (
            <motion.div
              key={feature.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ delay: idx * 0.1, duration: 0.8, ease: [0.21, 0.47, 0.32, 0.98] }}
              className={`p-8 sm:p-12 rounded-[2.5rem] border border-border/40 bg-muted/10 backdrop-blur-sm flex flex-col gap-8 group hover:bg-muted/20 transition-all duration-500 ${feature.isHighlight ? "md:col-span-2 lg:col-span-1" : ""}`}
            >
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-500 shadow-inner">
                <HugeiconsIcon icon={feature.icon} size={28} />
              </div>
              <div className="space-y-4">
                <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                  {feature.title}
                </h3>
                <div className="text-lg text-muted-foreground leading-relaxed text-balance">
                  {typeof feature.desc === "string" ? (
                    <p>{feature.desc}</p>
                  ) : (
                    feature.desc
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* CTA Section integration */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-32 p-12 sm:p-20 rounded-[3rem] bg-primary/5 border border-primary/20 text-center relative overflow-hidden group"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight mb-6 relative z-10">
            {t("cta.title")}
          </h2>
          <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto relative z-10 leading-relaxed">
            {t("cta.desc")}
          </p>
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="px-10 py-5 rounded-full bg-primary text-primary-foreground font-black text-lg shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all relative z-10"
          >
            {t("cta.button")}
          </button>
        </motion.div>
      </div>
    </section>
  );
}
