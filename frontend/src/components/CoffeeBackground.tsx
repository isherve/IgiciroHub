import React from 'react';
import { Image, ImageBackground, StyleSheet, View, ViewStyle } from 'react-native';

const coffeeBg = require('../../assets/images/coffee-bg.png');

type Props = {
  children?: React.ReactNode;
  style?: ViewStyle;
};

/**
 * Subtle transparent coffee watermark behind screen content.
 */
export function CoffeeBackground({ children, style }: Props) {
  return (
    <View style={[styles.wrap, style]}>
      <ImageBackground
        source={coffeeBg}
        style={StyleSheet.absoluteFill}
        imageStyle={styles.image}
        resizeMode="cover"
      />
      {children}
    </View>
  );
}

/** Standalone decorative layer for stacking inside layouts. */
export function CoffeeBackdrop() {
  return (
    <Image
      source={coffeeBg}
      style={styles.backdrop}
      resizeMode="contain"
      accessibilityIgnoresInvertColors
    />
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: 'transparent' },
  image: { opacity: 0.12 },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.1,
    width: '100%',
    height: '100%',
  },
});
