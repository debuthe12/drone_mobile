// src/components/VirtualJoystick.js
import React, { useRef, useState } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context'; // Import the hook

// --- Constants ---
const JOYSTICK_SIZE = 128;
const KNOB_SIZE = 48;
const KNOB_RADIUS = KNOB_SIZE / 2;
const JOYSTICK_RADIUS = JOYSTICK_SIZE / 2;
const MAX_KNOB_TRANSLATION = JOYSTICK_RADIUS - KNOB_RADIUS - 2; // Max distance knob center can move from joystick center (minus border width)
const ARROW_THRESHOLD_RATIO = 0.5; // How far knob needs to move to activate arrow (percentage of max translation)
const BASE_PADDING = 20; // Base padding from the safe area edges

const VirtualJoystick = ({ onLeftJoystickMove, onRightJoystickMove }) => {
    const insets = useSafeAreaInsets(); // Get safe area insets
    const [leftActive, setLeftActive] = useState(false);
    const [rightActive, setRightActive] = useState(false);

    const leftPosition = useRef(new Animated.ValueXY()).current;
    const rightPosition = useRef(new Animated.ValueXY()).current;

    const createJoystickGesture = (positionRef, onMoveCallback, setActiveState) => {
        return Gesture.Pan()
            .onStart(() => {
                setActiveState(true);
            })
            .onUpdate((event) => {
                const { translationX, translationY } = event;
                const distance = Math.sqrt(translationX * translationX + translationY * translationY);
                const scale = distance > MAX_KNOB_TRANSLATION ? MAX_KNOB_TRANSLATION / distance : 1;
                const x = translationX * scale;
                const y = translationY * scale;

                positionRef.setValue({ x, y });
                if (onMoveCallback) {
                    // Normalize the output to -1 to 1 range based on max translation
                    onMoveCallback({
                        x: x / MAX_KNOB_TRANSLATION,
                        y: y / MAX_KNOB_TRANSLATION
                    });
                }
            })
            .onEnd(() => {
                setActiveState(false);
                resetJoystick(positionRef);
                if (onMoveCallback) {
                    // Ensure a final (0,0) state is sent when released
                    onMoveCallback({ x: 0, y: 0 });
                }
            });
    };

    const leftGesture = createJoystickGesture(leftPosition, onLeftJoystickMove, setLeftActive);
    const rightGesture = createJoystickGesture(rightPosition, onRightJoystickMove, setRightActive);

    const resetJoystick = (position) => {
        Animated.spring(position, {
            toValue: { x: 0, y: 0 },
            stiffness: 150, // Adjust springiness as needed
            damping: 15,    // Adjust damping as needed
            useNativeDriver: true, // Use native driver for performance
        }).start();
    };

    const isArrowActive = (position, direction) => {
        // Use __getValue() for synchronous access if needed, but Animated values are complex
        // It's often better to derive active state from the normalized values sent in onMove
        // However, for direct visual feedback, __getValue() is sometimes used cautiously.
        // Here, we'll check against the raw translation values stored in the Animated.ValueXY
        const { x, y } = position.__getValue();
        const thresholdDistance = ARROW_THRESHOLD_RATIO * MAX_KNOB_TRANSLATION;

        switch (direction) {
            case 'up':
                return y < -thresholdDistance;
            case 'down':
                return y > thresholdDistance;
            case 'left':
                return x < -thresholdDistance;
            case 'right':
                return x > thresholdDistance;
            default:
                return false;
        }
    };

    const renderArrow = (direction, active, isRotation = false) => {
        let path = '';
        const activeColor = "white";
        const inactiveColor = "rgba(156, 163, 175, 0.5)"; // Gray, semi-transparent
        const strokeColor = active ? activeColor : inactiveColor;
        const fillColor = active ? activeColor : inactiveColor;

        if (isRotation && (direction === 'left' || direction === 'right')) {
             // Rotation arrows (anti-clockwise for left, clockwise for right)
            switch (direction) {
                case 'left': // Counter-clockwise arrow
                  path = "M15 4.5 A 7.5 7.5 0 1 0 15 19.5 M15 19.5 L12 16.5 M15 19.5 L18 16.5"; // Example circular path with arrow head
                  // Simpler Arc:
                  path = "M19 8 A 7 7 0 1 0 12 5 M 12 5 L 15 2 M 12 5 L 9 2" // Arc with arrow head at start
                  return (
                      <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth={1.5}>
                          <Path d={path} strokeLinecap="round" strokeLinejoin="round" />
                      </Svg>
                  );
              case 'right': // Clockwise arrow
                  path = "M9 4.5 A 7.5 7.5 0 1 1 9 19.5 M9 19.5 L12 16.5 M9 19.5 L6 16.5"; // Example circular path with arrow head
                  // Simpler Arc:
                  path = "M5 8 A 7 7 0 1 1 12 5 M 12 5 L 9 2 M 12 5 L 15 2" // Arc with arrow head at start
                  return (
                      <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth={1.5}>
                          <Path d={path} strokeLinecap="round" strokeLinejoin="round" />
                      </Svg>
                  );
            }
        }

        // Regular triangular arrows for other directions
        switch (direction) {
            case 'up':
                path = 'M12 4L4 14H20L12 4Z'; // Triangle pointing up
                break;
            case 'down':
                path = 'M12 20L20 10H4L12 20Z'; // Triangle pointing down
                break;
            case 'left':
                path = 'M4 12L14 20V4L4 12Z'; // Triangle pointing left
                break;
            case 'right':
                path = 'M20 12L10 4V20L20 12Z'; // Triangle pointing right
                break;
        }

        return (
            <Svg width={24} height={24} viewBox="0 0 24 24" stroke="none" fill={fillColor}>
                <Path d={path} />
            </Svg>
        );
    };

    // Dynamic style for the main container using insets
    const containerStyle = [
        styles.container,
        {
            // Add base padding PLUS the safe area inset
            paddingBottom: insets.bottom + BASE_PADDING,
            paddingLeft: insets.left + BASE_PADDING,
            paddingRight: insets.right + BASE_PADDING,
        }
    ];

    return (
        // Apply the dynamic container style here
        <View style={containerStyle} pointerEvents="box-none"> {/* Allow touches to pass through empty space */}
            {/* Left Joystick */}
            <GestureDetector gesture={leftGesture}>
                 {/* Make the container touchable */}
                <View style={styles.joystickOuterContainer} pointerEvents="box-only">
                    <View style={styles.joystickBase}>
                        {/* Directional Arrows */}
                        <View style={styles.arrowsContainer}>
                            <View style={[styles.arrow, styles.topArrow]}>
                                {renderArrow('up', isArrowActive(leftPosition, 'up'))}
                            </View>
                            <View style={[styles.arrow, styles.bottomArrow]}>
                                {renderArrow('down', isArrowActive(leftPosition, 'down'))}
                            </View>
                            <View style={[styles.arrow, styles.leftArrow]}>
                                {renderArrow('left', isArrowActive(leftPosition, 'left'), true)} {/* Yaw */}
                            </View>
                            <View style={[styles.arrow, styles.rightArrow]}>
                                {renderArrow('right', isArrowActive(leftPosition, 'right'), true)} {/* Yaw */}
                            </View>
                        </View>
                        {/* Joystick Knob */}
                        <Animated.View
                            style={[
                                styles.knob,
                                {
                                    transform: [
                                        { translateX: leftPosition.x },
                                        { translateY: leftPosition.y },
                                    ],
                                },
                            ]}
                        />
                    </View>
                </View>
            </GestureDetector>

            {/* Right Joystick */}
            <GestureDetector gesture={rightGesture}>
                <View style={styles.joystickOuterContainer} pointerEvents="box-only">
                    <View style={styles.joystickBase}>
                        {/* Directional Arrows */}
                        <View style={styles.arrowsContainer}>
                            <View style={[styles.arrow, styles.topArrow]}>
                                {renderArrow('up', isArrowActive(rightPosition, 'up'))}
                            </View>
                            <View style={[styles.arrow, styles.bottomArrow]}>
                                {renderArrow('down', isArrowActive(rightPosition, 'down'))}
                            </View>
                            <View style={[styles.arrow, styles.leftArrow]}>
                                {renderArrow('left', isArrowActive(rightPosition, 'left'))} {/* Roll */}
                            </View>
                            <View style={[styles.arrow, styles.rightArrow]}>
                                {renderArrow('right', isArrowActive(rightPosition, 'right'))} {/* Roll */}
                            </View>
                        </View>
                        {/* Joystick Knob */}
                        <Animated.View
                            style={[
                                styles.knob,
                                {
                                    transform: [
                                        { translateX: rightPosition.x },
                                        { translateY: rightPosition.y },
                                    ],
                                },
                            ]}
                        />
                    </View>
                </View>
            </GestureDetector>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 0, // Position at the bottom edge before padding
        left: 0,   // Position at the left edge before padding
        right: 0,  // Position at the right edge before padding
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end', // Align joysticks to the bottom after padding is applied
        // paddingHorizontal and paddingBottom are now applied dynamically using insets
    },
    joystickOuterContainer: {
        // This view captures the gesture for the joystick area
        width: JOYSTICK_SIZE,
        height: JOYSTICK_SIZE,
        // backgroundColor: 'rgba(0, 255, 0, 0.1)', // Optional: for debugging touch area
    },
    joystickBase: {
        width: JOYSTICK_SIZE,
        height: JOYSTICK_SIZE,
        borderRadius: JOYSTICK_RADIUS,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.1)', // Slight background for the base
        position: 'relative', // Needed for absolute positioning of arrows
    },
    arrowsContainer: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        top: 0,
        left: 0,
    },
    arrow: {
        position: 'absolute',
        width: 24, // SVG size
        height: 24, // SVG size
        // Centering adjustments within the arrow container might be needed depending on SVG viewbox
    },
    // Position arrows slightly inwards from the edge
    topArrow: {
        top: 8,
        left: '50%',
        marginLeft: -12, // Half of width
    },
    bottomArrow: {
        bottom: 8,
        left: '50%',
        marginLeft: -12, // Half of width
    },
    leftArrow: {
        left: 8,
        top: '50%',
        marginTop: -12, // Half of height
    },
    rightArrow: {
        right: 8,
        top: '50%',
        marginTop: -12, // Half of height
    },
    knob: {
        width: KNOB_SIZE,
        height: KNOB_SIZE,
        borderRadius: KNOB_RADIUS,
        backgroundColor: 'rgba(255, 255, 255, 0.3)', // Semi-transparent white
        borderWidth: 2,
        borderColor: 'white', // Solid white border
        position: 'absolute', // Position relative to the center of joystickBase
    },
});

export default VirtualJoystick;