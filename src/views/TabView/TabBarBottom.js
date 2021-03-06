/* @flow */

import * as React from 'react';
import {
  Animated,
  TouchableWithoutFeedback,
  StyleSheet,
  View,
  Platform,
  Keyboard,
  Dimensions,
} from 'react-native';
import TabBarIcon from './TabBarIcon';
import SafeAreaView from '../SafeAreaView';
import withOrientation from '../withOrientation';
import type { Layout } from 'react-native-tab-view/src/TabViewTypeDefinitions';

import type {
  NavigationRoute,
  NavigationState,
  NavigationScreenProp,
  ViewStyleProp,
  TextStyleProp,
} from '../../TypeDefinition';

import type { TabScene } from './TabView';

type Props = {
  activeTintColor: string,
  activeBackgroundColor: string,
  inactiveTintColor: string,
  inactiveBackgroundColor: string,
  showLabel: boolean,
  showIcon: boolean,
  allowFontScaling: boolean,
  position: Animated.Value,
  navigation: NavigationScreenProp<NavigationState>,
  jumpToIndex: (index: number) => void,
  getLabel: (scene: TabScene) => ?(React.Node | string),
  getOnPress: (
    previousScene: NavigationRoute,
    scene: TabScene
  ) => ({
    previousScene: NavigationRoute,
    scene: TabScene,
    jumpToIndex: (index: number) => void,
  }) => void,
  getTestIDProps: (scene: TabScene) => (scene: TabScene) => any,
  renderIcon: (scene: TabScene) => React.Node,
  style?: ViewStyleProp,
  animateStyle?: ViewStyleProp,
  labelStyle?: TextStyleProp,
  tabStyle?: ViewStyleProp,
  showIcon?: boolean,
  isLandscape: boolean,
  layout: Layout,
  adaptive: boolean,
};

const majorVersion = parseInt(Platform.Version, 10);
const isIos = Platform.OS === 'ios';
const isIOS11 = majorVersion >= 11 && isIos;
const isTablet =
  Dimensions.get('window').height / Dimensions.get('window').width < 1.6;
const defaultMaxTabBarItemWidth = 125;

class TabBarBottom extends React.PureComponent<Props> {
  // See https://developer.apple.com/library/content/documentation/UserExperience/Conceptual/UIKitUICatalog/UITabBar.html
  static defaultProps = {
    activeTintColor: '#3478f6', // Default active tint color in iOS 10
    activeBackgroundColor: 'transparent',
    inactiveTintColor: '#929292', // Default inactive tint color in iOS 10
    inactiveBackgroundColor: 'transparent',
    showLabel: true,
    showIcon: true,
    allowFontScaling: true,
    adaptive: isIOS11,
  };

  _renderLabel = (scene: TabScene) => {
    const {
      position,
      navigation,
      activeTintColor,
      inactiveTintColor,
      labelStyle,
      showLabel,
      showIcon,
      isLandscape,
      allowFontScaling,
    } = this.props;
    if (showLabel === false) {
      return null;
    }
    const { index } = scene;
    const { routes } = navigation.state;
    // Prepend '-1', so there are always at least 2 items in inputRange
    const inputRange = [-1, ...routes.map((x: *, i: number) => i)];
    const outputRange = inputRange.map(
      (inputIndex: number) =>
        inputIndex === index ? activeTintColor : inactiveTintColor
    );
    const color = position.interpolate({
      inputRange,
      outputRange: (outputRange: Array<string>),
    });

    const tintColor = scene.focused ? activeTintColor : inactiveTintColor;
    const label = this.props.getLabel({ ...scene, tintColor });

    if (typeof label === 'string') {
      return (
        <Animated.Text
          style={[
            styles.label,
            { color },
            showIcon && this._shouldUseHorizontalTabs()
              ? styles.labelBeside
              : styles.labelBeneath,
            labelStyle,
          ]}
          allowFontScaling={allowFontScaling}
        >
          {label}
        </Animated.Text>
      );
    }

    if (typeof label === 'function') {
      return label({ ...scene, tintColor });
    }

    return label;
  };

  _renderIcon = (scene: TabScene) => {
    const {
      position,
      navigation,
      activeTintColor,
      inactiveTintColor,
      renderIcon,
      showIcon,
      showLabel,
    } = this.props;
    if (showIcon === false) {
      return null;
    }
    return (
      <TabBarIcon
        position={position}
        navigation={navigation}
        activeTintColor={activeTintColor}
        inactiveTintColor={inactiveTintColor}
        renderIcon={renderIcon}
        scene={scene}
        style={showLabel && this._shouldUseHorizontalTabs() ? {} : styles.icon}
      />
    );
  };

  _renderTestIDProps = (scene: TabScene) => {
    const testIDProps =
      this.props.getTestIDProps && this.props.getTestIDProps(scene);
    return testIDProps;
  };

  _tabItemMaxWidth() {
    const { tabStyle, layout } = this.props;
    let maxTabBarItemWidth;

    const flattenedTabStyle = StyleSheet.flatten(tabStyle);

    if (flattenedTabStyle) {
      if (typeof flattenedTabStyle.width === 'number') {
        maxTabBarItemWidth = flattenedTabStyle.width;
      } else if (
        typeof flattenedTabStyle.width === 'string' &&
        flattenedTabStyle.endsWith('%')
      ) {
        const width = parseFloat(flattenedTabStyle.width);
        if (Number.isFinite(width)) {
          maxTabBarItemWidth = layout.width * (width / 100);
        }
      } else if (typeof flattenedTabStyle.maxWidth === 'number') {
        maxTabBarItemWidth = flattenedTabStyle.maxWidth;
      } else if (
        typeof flattenedTabStyle.maxWidth === 'string' &&
        flattenedTabStyle.endsWith('%')
      ) {
        const width = parseFloat(flattenedTabStyle.maxWidth);
        if (Number.isFinite(width)) {
          maxTabBarItemWidth = layout.width * (width / 100);
        }
      }
    }

    if (!maxTabBarItemWidth) {
      maxTabBarItemWidth = defaultMaxTabBarItemWidth;
    }

    return maxTabBarItemWidth;
  }

  _shouldUseHorizontalTabs() {
    const { routes } = this.props.navigation.state;
    const { isLandscape, layout, adaptive, tabStyle } = this.props;

    if (!adaptive) {
      return false;
    }

    let tabBarWidth = layout.width;
    if (tabBarWidth === 0) {
      return isTablet;
    }

    const isHeightConstrained = layout.height < 500;
    if (isHeightConstrained) {
      return isLandscape;
    } else {
      const maxTabBarItemWidth = this._tabItemMaxWidth();
      return routes.length * maxTabBarItemWidth <= tabBarWidth;
    }
  }

  render() {
    const {
      position,
      navigation,
      jumpToIndex,
      getOnPress,
      getTestIDProps,
      activeBackgroundColor,
      inactiveBackgroundColor,
      style,
      animateStyle,
      tabStyle,
      isLandscape,
      layout,
    } = this.props;
    const { routes } = navigation.state;
    const previousScene = routes[navigation.state.index];
    // Prepend '-1', so there are always at least 2 items in inputRange
    const inputRange = [-1, ...routes.map((x: *, i: number) => i)];

    const isHeightConstrained =
      layout.height === 0 ? !isTablet : layout.height < 500;
    const tabBarStyle = [
      styles.tabBar,
      this._shouldUseHorizontalTabs() && isHeightConstrained
        ? styles.tabBarCompact
        : styles.tabBarRegular,
      style,
    ];

    return (
      <Animated.View style={animateStyle}>
        <SafeAreaView
          style={tabBarStyle}
          forceInset={{ bottom: 'always', top: 'never' }}
        >
          {routes.map((route: NavigationRoute, index: number) => {
            const focused = index === navigation.state.index;
            const scene = { route, index, focused };
            const onPress = getOnPress(previousScene, scene);
            const outputRange = inputRange.map(
              (inputIndex: number) =>
                inputIndex === index
                  ? activeBackgroundColor
                  : inactiveBackgroundColor
            );
            const backgroundColor = position.interpolate({
              inputRange,
              outputRange: (outputRange: Array<string>),
            });

            const justifyContent = this.props.showIcon ? 'flex-end' : 'center';
            const extraProps = this._renderTestIDProps(scene) || {};
            const { testID, accessibilityLabel } = extraProps;

            return (
              <TouchableWithoutFeedback
                key={route.key}
                testID={testID}
                accessibilityLabel={accessibilityLabel}
                onPress={() =>
                  onPress
                    ? onPress({ previousScene, scene, jumpToIndex })
                    : jumpToIndex(index)}
              >
                <Animated.View style={[styles.tab, { backgroundColor }]}>
                  <View
                    style={[
                      styles.tab,
                      this._shouldUseHorizontalTabs()
                        ? styles.tabLandscape
                        : styles.tabPortrait,
                      tabStyle,
                    ]}
                  >
                    {this._renderIcon(scene)}
                    {this._renderLabel(scene)}
                  </View>
                </Animated.View>
              </TouchableWithoutFeedback>
            );
          })}
        </SafeAreaView>
      </Animated.View>
    );
  }
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#F7F7F7', // Default background color in iOS 10
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0, 0, 0, .3)',
    flexDirection: 'row',
  },
  tabBarCompact: {
    height: 29,
  },
  tabBarRegular: {
    height: 49,
  },
  tab: {
    flex: 1,
    alignItems: isIos ? 'center' : 'stretch',
  },
  tabPortrait: {
    justifyContent: 'flex-end',
    flexDirection: 'column',
  },
  tabLandscape: {
    justifyContent: 'center',
    flexDirection: 'row',
  },
  icon: {
    flexGrow: 1,
  },
  label: {
    textAlign: 'center',
    backgroundColor: 'transparent',
  },
  labelBeneath: {
    fontSize: 10,
    marginBottom: 1.5,
  },
  labelBeside: {
    fontSize: 13,
    marginLeft: 20,
  },
});

export default withOrientation(TabBarBottom);
