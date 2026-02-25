import { useState } from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import { supabase } from "../../lib/supabase";
import { useRouter } from "expo-router";
import Logo from "../../components/Logo";

export default function Onboarding() {
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [intent, setIntent] = useState("serious");
  const router = useRouter();

  const save = async () => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;

    const { error } = await supabase.from("users").upsert({
      id: user.id,
      name,
      bio,
      intent,
      photos: [],
    });

    if (error) return alert(error.message);
    router.replace("/(main)/swipe");
  };

  return (
    <View className="flex-1 bg-[#FDFAF5] px-6 pt-20">
      {/* Logo at top */}
      <View className="items-center mb-6">
        <Logo variant="colored" width={120} />
      </View>

      <Text className="text-[#1C1208] text-2xl font-bold mb-6">Create Profile</Text>

      <TextInput
        className="bg-white text-[#1C1208] p-4 rounded-2xl mb-4 border border-[#EDE5D5]"
        placeholder="Name"
        placeholderTextColor="#777"
        onChangeText={setName}
        value={name}
      />

      <TextInput
        className="bg-white text-[#1C1208] p-4 rounded-2xl mb-4 h-28 border border-[#EDE5D5]"
        placeholder="Bio"
        placeholderTextColor="#777"
        onChangeText={setBio}
        value={bio}
        multiline
      />

      <View className="flex-row gap-2 mb-6">
        {["serious","marriage","casual"].map(i => (
          <Pressable
            key={i}
            className={`px-4 py-2 rounded-full ${intent===i?"bg-[#B8860B]":"bg-[#F5F0E8]"}`}
            onPress={()=>setIntent(i)}
          >
            <Text className="text-[#1C1208]">{i}</Text>
          </Pressable>
        ))}
      </View>

      <Pressable className="bg-[#B8860B] p-4 rounded-2xl items-center" onPress={save}>
        <Text className="text-[#1C1208] font-semibold">Continue</Text>
      </Pressable>
    </View>
  );
}
