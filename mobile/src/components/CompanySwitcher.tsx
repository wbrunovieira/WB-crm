import { useMemo } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useEmpresa } from "@/theme/CompanyContext";
import type { BrandColors } from "@/theme";

/**
 * Troca a empresa ativa: muda as cores, a API e o token de uma vez.
 * Só aparece quando há mais de uma empresa com token embutido — num build só com a WB,
 * não ocupa espaço na tela.
 */
export function CompanySwitcher() {
  const { empresa, trocar, disponiveis } = useEmpresa();
  const c = empresa.cores;
  const styles = useMemo(() => makeStyles(c), [c]);

  if (disponiveis.length < 2) return null;

  return (
    <View style={styles.linha}>
      {disponiveis.map((e) => {
        const ativa = e.key === empresa.key;
        return (
          <Pressable
            key={e.key}
            onPress={() => { if (!ativa) void trocar(e.key); }}
            accessibilityRole="button"
            accessibilityState={{ selected: ativa }}
            style={({ pressed }) => [
              styles.chip,
              { borderColor: e.cores.accent },
              ativa && { backgroundColor: e.cores.accent },
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.texto, { color: ativa ? "#fff" : e.cores.accent }]}>{e.curto}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const makeStyles = (c: BrandColors) => StyleSheet.create({
  linha: { flexDirection: "row", gap: 8, marginBottom: 14 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 },
  texto: { fontSize: 12, fontWeight: "700", letterSpacing: 0.5 },
  pressed: { opacity: 0.7 },
});
