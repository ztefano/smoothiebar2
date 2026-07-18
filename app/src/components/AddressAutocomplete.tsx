import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  autocompleteAddress,
  getPlaceCoordinates,
  newSessionToken,
  type PlacePrediction,
} from "@/lib/places";
import type { Coordinates } from "@/types";

interface AddressAutocompleteProps {
  value: string;
  onChangeText: (text: string) => void;
  onSelectPlace: (result: { address: string; coords: Coordinates }) => void;
  placeholder?: string;
}

const DEBOUNCE_MS = 300;

/** Input de dirección con sugerencias de Google Places mientras se escribe. */
export function AddressAutocomplete({
  value,
  onChangeText,
  onSelectPlace,
  placeholder,
}: AddressAutocompleteProps) {
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [loading, setLoading] = useState(false);
  const sessionTokenRef = useRef(newSessionToken());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.trim().length < 3) {
      setPredictions([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      const results = await autocompleteAddress(value, sessionTokenRef.current);
      setPredictions(results);
      setLoading(false);
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value]);

  async function handleSelect(prediction: PlacePrediction) {
    const coords = await getPlaceCoordinates(prediction.placeId, sessionTokenRef.current);
    setPredictions([]);
    onChangeText(prediction.description);
    if (coords) {
      onSelectPlace({ address: prediction.description, coords });
    }
    sessionTokenRef.current = newSessionToken();
  }

  return (
    <View>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder={placeholder ?? "Dirección"}
          value={value}
          onChangeText={onChangeText}
        />
        {loading ? <ActivityIndicator style={styles.spinner} size="small" /> : null}
      </View>

      {predictions.length > 0 ? (
        <View style={styles.dropdown}>
          <FlatList
            data={predictions}
            keyExtractor={(item) => item.placeId}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable style={styles.suggestion} onPress={() => handleSelect(item)}>
                <Text style={styles.suggestionText} numberOfLines={2}>
                  {item.description}
                </Text>
              </Pressable>
            )}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  inputRow: { position: "relative", justifyContent: "center" },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  spinner: { position: "absolute", right: 14 },
  dropdown: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    marginTop: 4,
    maxHeight: 220,
    backgroundColor: "white",
  },
  suggestion: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  suggestionText: { fontSize: 14, color: "#111827" },
});
