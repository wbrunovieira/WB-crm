import { View, Text, TextInput, Pressable, StyleSheet, Linking, Alert } from "react-native";

/**
 * Campo de formulário do app. Extraído porque ManualLeadForm e a tela de parceiro tinham
 * cópias idênticas — e a melhoria do link precisava valer nas duas.
 *
 * `abrirComoLink`: quando o campo tem um valor que parece endereço, aparece um botão ao lado
 * para abrir no navegador. O input continua totalmente editável — a intenção é poder espiar o
 * site da empresa antes de entrar, sem perder a chance de corrigir o que o Google trouxe.
 * Botão visível em vez de gesto (toque longo, deslizar): gesto invisível ninguém descobre, e
 * quem está na rua não vai caçar interação escondida.
 */

/** Um valor so vira link se tiver ponto e nenhum espaco — evita oferecer "abrir" para texto
 *  digitado pela metade, que abriria o navegador em nada. */
export function pareceEndereco(valor?: string | null): boolean {
  if (!valor) return false;
  const v = valor.trim();
  return v.length > 3 && v.includes(".") && !/\s/.test(v);
}

/** O Google costuma devolver com esquema, mas cadastro na mão raramente tem. */
export function comEsquema(valor: string): string {
  const v = valor.trim();
  return /^https?:\/\//i.test(v) ? v : `https://${v}`;
}

export function Field({
  label,
  multiline,
  abrirComoLink,
  ...props
}: {
  label: string;
  multiline?: boolean;
  abrirComoLink?: boolean;
} & React.ComponentProps<typeof TextInput>) {
  const valor = typeof props.value === "string" ? props.value : "";
  const podeAbrir = !!abrirComoLink && pareceEndereco(valor);

  async function abrir() {
    const url = comEsquema(valor);
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert("Não foi possível abrir", url);
    }
  }

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.linha}>
        <TextInput
          placeholderTextColor="#8a6d9c"
          style={[styles.input, multiline && styles.multiline, podeAbrir && styles.inputComBotao]}
          multiline={multiline}
          {...props}
        />
        {podeAbrir && (
          <Pressable
            onPress={abrir}
            hitSlop={10}
            accessibilityLabel={`Abrir ${label.toLowerCase()}`}
            style={({ pressed }) => [styles.botao, pressed && styles.botaoPressed]}
          >
            <Text style={styles.botaoTexto}>↗</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Copiados EXATAMENTE do Field original (ManualLeadForm.tsx:690-693). Inventar estilo aqui
  // faria o campo destoar de todos os outros do formulario.
  field: { gap: 4 },
  label: { color: "#b79ec6", fontSize: 13 },
  input: {
    flex: 1,
    backgroundColor: "#2a1533",
    borderColor: "#4d2b5d",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#fff",
    fontSize: 15,
  },
  multiline: { minHeight: 80, textAlignVertical: "top" },
  linha: { flexDirection: "row", alignItems: "center", gap: 6 },
  // Sem isto o texto passa por baixo do botao quando a URL e longa.
  inputComBotao: { paddingRight: 6 },
  botao: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#4d2b5d",
    backgroundColor: "#2a1533",
  },
  botaoPressed: { opacity: 0.6 },
  botaoTexto: { color: "#b79ec6", fontSize: 16, fontWeight: "700" },
});
