import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TextInput, TouchableOpacity, Dimensions, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

const COLORS = {
  green: '#16A34A',
  greenLight: '#F0FDF4',
  textDark: '#111827',
  textMuted: '#6B7280',
  border: '#E5E7EB',
  white: '#FFFFFF',
  bgLight: '#F9FAFB',
  gold: '#F59E0B',
};

const CATEGORIES = [
  'Residential Construction',
  'Commercial Construction',
  'Architecture & Design',
  'Interior Design',
  'Renovation',
  'Civil Work'
];

export default function PostProjectScreen() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [location, setLocation] = useState('');
  const [budget, setBudget] = useState('');
  const [description, setDescription] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = () => {
    if (!title.trim() || !location.trim() || !budget.trim() || !description.trim()) {
      if (Platform.OS === 'web') {
        alert('Please fill out all fields.');
      } else {
        Alert.alert('Required Fields', 'Please fill out all fields before publishing.');
      }
      return;
    }

    setSuccess(true);
    setTimeout(() => {
      // Clear form
      setTitle('');
      setLocation('');
      setBudget('');
      setDescription('');
      setSuccess(false);
      // Navigate back to Home
      router.push('/');
    }, 2000);
  };

  if (success) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.successContainer}>
          <View style={styles.successIconBox}>
            <Feather name="check" size={40} color={COLORS.white} />
          </View>
          <Text style={styles.successTitle}>Project Posted!</Text>
          <Text style={styles.successMessage}>
            Your project has been successfully published. Contractors and architects will contact you shortly.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header Bar */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Post Project</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Banner Block */}
        <View style={styles.bannerContainer}>
          <View style={styles.bannerIconBox}>
            <Feather name="info" size={18} color={COLORS.green} />
          </View>
          <Text style={styles.bannerText}>
            Describe your project details clearly. Accurate details attract better matching professionals and competitive quotes.
          </Text>
        </View>

        {/* Form Fields */}
        <View style={styles.formContainer}>
          {/* Project Title */}
          <Text style={styles.label}>Project Title</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Modern 3BHK Villa Construction"
            placeholderTextColor={COLORS.textMuted}
            value={title}
            onChangeText={setTitle}
          />

          {/* Project Category Select */}
          <Text style={styles.label}>Select Category</Text>
          <View style={styles.categoriesRow}>
            {CATEGORIES.map((cat) => {
              const isSelected = category === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryChip,
                    isSelected && styles.categoryChipSelected
                  ]}
                  onPress={() => setCategory(cat)}
                >
                  <Text style={[
                    styles.categoryChipText,
                    isSelected && styles.categoryChipTextSelected
                  ]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Location */}
          <Text style={styles.label}>Project Location</Text>
          <View style={styles.inputWrapper}>
            <Feather name="map-pin" size={16} color={COLORS.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.inputWithIcon}
              placeholder="e.g. Mumbai, Maharashtra"
              placeholderTextColor={COLORS.textMuted}
              value={location}
              onChangeText={setLocation}
            />
          </View>

          {/* Budget */}
          <Text style={styles.label}>Estimated Budget (INR)</Text>
          <View style={styles.inputWrapper}>
            <Text style={styles.currencySymbol}>₹</Text>
            <TextInput
              style={styles.inputWithIcon}
              placeholder="e.g. 25,00,000"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numeric"
              value={budget}
              onChangeText={setBudget}
            />
          </View>

          {/* Description */}
          <Text style={styles.label}>Project Description & Scope</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Provide a brief description of the work needed, timeline, and material preferences..."
            placeholderTextColor={COLORS.textMuted}
            multiline={true}
            numberOfLines={4}
            value={description}
            onChangeText={setDescription}
          />

          {/* Submit Button */}
          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} activeOpacity={0.9}>
            <Text style={styles.submitBtnText}>Publish Project</Text>
            <Feather name="arrow-right" size={18} color={COLORS.white} style={{ marginLeft: 6 }} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  header: {
    height: 60,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: 24, fontWeight: '800', color: COLORS.textDark },
  scrollContent: { paddingBottom: 40 },
  
  /* BANNER */
  bannerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.greenLight,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.green + '22',
  },
  bannerIconBox: { marginRight: 12 },
  bannerText: { flex: 1, color: COLORS.textDark, fontSize: 13, lineHeight: 18, fontWeight: '500' },

  /* FORM */
  formContainer: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    color: COLORS.textDark,
    backgroundColor: COLORS.bgLight,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    backgroundColor: COLORS.bgLight,
    height: 48,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMuted,
    marginRight: 8,
  },
  inputWithIcon: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    color: COLORS.textDark,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  categoriesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  categoryChipSelected: {
    borderColor: COLORS.green,
    backgroundColor: COLORS.greenLight,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  categoryChipTextSelected: {
    color: COLORS.green,
  },
  submitBtn: {
    height: 48,
    backgroundColor: COLORS.green,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 28,
  },
  submitBtnText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
  },

  /* SUCCESS STATE */
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  successIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.green,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.green,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
      },
      android: {
        elevation: 6,
      },
      web: {
        boxShadow: '0 4px 12px rgba(22, 163, 74, 0.3)'
      }
    })
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: 10,
  },
  successMessage: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  }
});
