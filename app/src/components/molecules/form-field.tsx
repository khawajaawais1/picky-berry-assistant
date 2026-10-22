import { View } from 'react-native';

import { AppText, AppTextInput, type AppTextInputProps } from '../atoms';

export type FormFieldProps = AppTextInputProps & {
  /** The design's “Field label”: 14 px semibold, sitting 7 px above its input. */
  label: string;
};

/**
 * One labelled form control, at the design's metrics (frame 03, node 5:22788): the
 * label and its input 7 px apart, the input always the frame's 54 px box.
 *
 * The label becomes the input's accessible name, so a screen reader announces the
 * field rather than an unlabelled box.
 */
export function FormField({ label, ...inputProps }: FormFieldProps) {
  return (
    <View className="w-full gap-label">
      <AppText style={{ fontWeight: '600' }} variant="bodySmall">
        {label}
      </AppText>
      <AppTextInput accessibilityLabel={label} {...inputProps} />
    </View>
  );
}
